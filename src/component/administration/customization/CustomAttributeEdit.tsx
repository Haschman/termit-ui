import React from "react";
import RdfsResource, { CustomAttribute } from "../../../model/RdfsResource";
import { useI18n } from "../../hook/useI18n";
import MultilingualString, {
  getLocalized,
  getLocalizedOrDefault,
  isLanguageBlank,
} from "../../../model/MultilingualString";
import {
  getLanguagesWithRequired,
  getShortLocale,
} from "../../../util/IntlUtil";
import EditLanguageSelector from "../../multilingual/EditLanguageSelector";
import {
  Button,
  ButtonToolbar,
  Card,
  CardBody,
  Col,
  Form,
  FormGroup,
  Label,
  Row,
} from "reactstrap";
import CustomInput from "../../misc/CustomInput";
import MultilingualIcon from "../../misc/MultilingualIcon";
import ValidationResult from "../../../model/form/ValidationResult";
import { useDispatch, useSelector } from "react-redux";
import TermItState from "../../../model/TermItState";
import {
  CustomAttributeSelector,
  DOMAIN_OPTIONS,
  RANGE_OPTIONS,
} from "./CustomAttributeSelector";
import HeaderWithActions from "../../misc/HeaderWithActions";
import Routes from "../../../util/Routes";
import Routing from "../../../util/Routing";
import { trackPromise } from "react-promise-tracker";
import { ThunkDispatch } from "../../../util/Types";
import {
  createCustomAttribute,
  getCustomAttributes,
  updateCustomAttribute,
} from "../../../action/AsyncActions";
import PromiseTrackingMask from "../../misc/PromiseTrackingMask";
import { useParams } from "react-router-dom";
import VocabularyUtils from "../../../util/VocabularyUtils";
import { loadIdentifier } from "../../asset/CreateAssetUtils";
import ShowAdvancedAssetFields from "src/component/asset/ShowAdvancedAssetFields";
import { IntelligentTreeSelect } from "intelligent-tree-select";
import HelpIcon from "../../misc/HelpIcon";
import { SelectorOption } from "./CustomAttributeSelector";

const SKOS_TERM_RELATIONSHIP_PROPERTIES = [
  {
    iris: [
      "http://www.w3.org/2004/02/skos/core#related",
      "http://www.w3.org/2004/02/skos/core#relatedMatch",
    ],
    labelKey: "term.metadata.related.title",
  },
  {
    iris: [
      "http://www.w3.org/2004/02/skos/core#broader",
      "http://www.w3.org/2004/02/skos/core#broadMatch",
    ],
    labelKey: "term.metadata.parent",
  },
  {
    iris: [
      "http://www.w3.org/2004/02/skos/core#narrower",
      "http://www.w3.org/2004/02/skos/core#narrowMatch",
    ],
    labelKey: "term.metadata.subTerms",
  },
  {
    iris: ["http://www.w3.org/2004/02/skos/core#exactMatch"],
    labelKey: "term.metadata.exactMatches",
  },
];

function propertyWithLabelExists(
  label: string,
  language: string,
  properties: RdfsResource[],
  customAttributes: CustomAttribute[]
) {
  return (
    customAttributes.some((p) => (p.label || {})[language] === label) ||
    properties.some((p) => (p.label || {})[language] === label)
  );
}

function getTermRelationshipProperties(
  customAttributes: CustomAttribute[],
  language: string,
  i18n: (key: string) => string
): SelectorOption[] {
  const basicOptions = SKOS_TERM_RELATIONSHIP_PROPERTIES.map((p) => ({
    value: p.iris.join(","),
    label: i18n(p.labelKey),
  }));

  const customOptions = customAttributes
    .filter(
      (ca) =>
        ca.domainIri === VocabularyUtils.TERM &&
        ca.rangeIri === VocabularyUtils.TERM
    )
    .map((ca) => ({
      value: ca.iri,
      label: getLocalized(ca.label, language) || ca.iri,
    }));

  return [...basicOptions, ...customOptions];
}

export const CustomAttributeEdit: React.FC = () => {
  const { i18n, formatMessage, locale } = useI18n();
  const dispatch: ThunkDispatch = useDispatch();
  const { name } = useParams<{ name?: string }>();
  const [label, setLabel] = React.useState<MultilingualString>({});
  const [originalLabel, setOriginalLabel] = React.useState<MultilingualString>(
    {}
  );
  const [comment, setComment] = React.useState<MultilingualString>({});
  const [domain, setDomain] = React.useState<string>(VocabularyUtils.TERM);
  const [range, setRange] = React.useState<string>(VocabularyUtils.XSD_STRING);
  const [language, setLanguage] = React.useState(getShortLocale(locale));
  const [iri, setIri] = React.useState("");
  const [shouldGenerateIri, setShouldGenerateIri] = React.useState(true);
  const [annotatedRelationships, setAnnotatedRelationships] = React.useState<
    string[]
  >([]);
  const customAttributes = useSelector(
    (state: TermItState) => state.customAttributes
  );
  const primaryLanguage = useSelector(
    (state: TermItState) => state.configuration.language
  );
  const properties = useSelector((state: TermItState) => state.properties);
  const editedAttribute = React.useMemo(
    () => customAttributes.find((p) => p.iri.endsWith("/" + name)),
    [customAttributes, name]
  );
  const editingMode = React.useMemo(() => name !== "create", [name]);

  const termRelationshipOptions = React.useMemo(
    () =>
      getTermRelationshipProperties(
        customAttributes,
        getShortLocale(locale),
        i18n
      ),
    [customAttributes, locale, i18n]
  );

  React.useEffect(() => {
    dispatch(getCustomAttributes());
  }, [dispatch]);

  React.useEffect(() => {
    if (editingMode) {
      if (editedAttribute) {
        setIri(editedAttribute.iri);
        setLabel(editedAttribute.label || {});
        setOriginalLabel(editedAttribute.label || {});
        setComment(editedAttribute.comment || {});
        setDomain(editedAttribute.domainIri || "");
        setRange(editedAttribute.rangeIri || "");

        const relationships = editedAttribute.annotatedRelationships;
        if (relationships && Array.isArray(relationships)) {
          const iris = relationships.map((r) =>
            typeof r === "string" ? r : r.iri || (r as any)["@id"] || ""
          );

          const groupedIris: string[] = [];
          const processedIris = new Set<string>();

          iris.forEach((iri) => {
            if (processedIris.has(iri)) return;

            const group = SKOS_TERM_RELATIONSHIP_PROPERTIES.find((p) =>
              p.iris.includes(iri)
            );

            if (group) {
              groupedIris.push(group.iris.join(","));
              group.iris.forEach((i) => processedIris.add(i));
            } else {
              groupedIris.push(iri);
              processedIris.add(iri);
            }
          });

          setAnnotatedRelationships(groupedIris);
        } else {
          setAnnotatedRelationships([]);
        }
      }
      setShouldGenerateIri(false);
    }
  }, [editingMode, editedAttribute]);

  const onRemoveTranslation = (lang: string) => {
    const newLabel = { ...label };
    delete newLabel[lang];
    const newComment = { ...comment };
    delete newComment[lang];
    setLabel(newLabel);
    setComment(newComment);
  };
  const onLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLabel = { ...label };
    newLabel[language] = e.target.value;

    setLabel(newLabel);
    if (
      shouldGenerateIri &&
      language === primaryLanguage &&
      e.target.value.trim().length > 0
    ) {
      loadIdentifier({
        name: e.target.value.trim(),
        assetType: "CUSTOM_ATTRIBUTE",
      }).then((resp) => setIri(resp.data));
    }
  };
  const labelValidation =
    (!editingMode || label[language] !== originalLabel[language]) &&
    (label[language] || "").length > 0 &&
    propertyWithLabelExists(
      label[language],
      language,
      properties,
      customAttributes
    )
      ? ValidationResult.blocker(
          formatMessage(
            "administration.customization.customAttributes.labelExists",
            {
              label: label[language],
            }
          )
        )
      : undefined;
  const onCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newComment = { ...comment };
    newComment[language] = e.target.value;
    setComment(newComment);
  };
  const goToAdministration = () => {
    Routing.transitionTo(Routes.administration, {
      query: new Map<string, string>([
        ["activeTab", "administration.customization.title"],
      ]),
    });
  };
  const onIriChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIri(e.target.value);
    setShouldGenerateIri(e.target.value.trim().length === 0);
  };

  const onSave = () => {
    let promise;
    const annotatedRelationshipsData =
      domain === VocabularyUtils.RDF_STATEMENT
        ? annotatedRelationships.flatMap((value) =>
            value.includes(",")
              ? value.split(",").map((iri) => ({ iri }))
              : [{ iri: value }]
          )
        : undefined;

    if (editingMode) {
      const data = new CustomAttribute({
        ...editedAttribute!,
        label,
        comment,
        domain,
        range,
        annotatedRelationships: annotatedRelationshipsData,
      });
      promise = dispatch(updateCustomAttribute(data));
    } else {
      promise = dispatch(
        createCustomAttribute(
          new CustomAttribute({
            iri,
            label,
            comment,
            domain,
            range,
            annotatedRelationships: annotatedRelationshipsData,
            types: [VocabularyUtils.NS_TERMIT + "vlastní-atribut"],
          })
        )
      );
    }
    trackPromise(promise, "custom-attribute-edit").then(() => {
      goToAdministration();
    });
  };
  const onCancel = () => {
    goToAdministration();
  };

  return (
    <>
      <HeaderWithActions
        title={i18n(
          `administration.customization.customAttributes.${
            editingMode ? "update" : "add"
          }`
        )}
      />
      <PromiseTrackingMask area="custom-attribute-edit" />
      <EditLanguageSelector
        language={language}
        requiredLanguage={primaryLanguage}
        existingLanguages={getLanguagesWithRequired(
          primaryLanguage,
          ["label", "comment"],
          {
            label,
            comment,
          }
        )}
        onSelect={setLanguage}
        onRemove={onRemoveTranslation}
      />
      <Card id="custom-attribute-edit">
        <CardBody>
          <Form>
            <Row>
              <Col xs={12}>
                <CustomInput
                  name="custom-attribute-edit-label"
                  label={
                    <>
                      {i18n("properties.edit.new.label")}
                      <MultilingualIcon id="custom-attribute-edit-label-multilingual" />
                    </>
                  }
                  hint={i18n("required")}
                  onChange={onLabelChange}
                  autoFocus={true}
                  validation={labelValidation}
                  value={getLocalizedOrDefault(label, "", language)}
                />
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <CustomInput
                  name="custom-attribute-edit-comment"
                  label={
                    <>
                      {i18n("properties.edit.new.comment")}
                      <MultilingualIcon id="custom-attribute-edit-comment-multilingual" />
                    </>
                  }
                  onChange={onCommentChange}
                  value={getLocalizedOrDefault(comment, "", language)}
                />
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <CustomAttributeSelector
                  onChange={setDomain}
                  value={domain}
                  options={DOMAIN_OPTIONS}
                  labelKey="administration.customization.customAttributes.domain"
                  disabled={editingMode}
                />
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <CustomAttributeSelector
                  onChange={setRange}
                  value={range}
                  options={RANGE_OPTIONS}
                  labelKey="administration.customization.customAttributes.range"
                  disabled={editingMode}
                />
              </Col>
            </Row>
            {domain === VocabularyUtils.RDF_STATEMENT && (
              <Row>
                <Col xs={12}>
                  <FormGroup>
                    <Label className="attribute-label">
                      {i18n(
                        "administration.customization.customAttributes.annotatedRelationships"
                      )}
                      <HelpIcon
                        id="annotated-relationships-help"
                        text={i18n(
                          "administration.customization.customAttributes.annotatedRelationships.help"
                        )}
                      />
                    </Label>
                    <IntelligentTreeSelect
                      id="custom-attribute-annotated-relationships"
                      options={termRelationshipOptions}
                      value={annotatedRelationships.map(
                        (iri) =>
                          termRelationshipOptions.find(
                            (opt) => opt.value === iri
                          ) || {
                            value: iri,
                            label: iri,
                          }
                      )}
                      valueKey="value"
                      labelKey="label"
                      multi={true}
                      simpleTreeData={true}
                      onChange={(selected: any) =>
                        setAnnotatedRelationships(
                          selected ? selected.map((s: any) => s.value) : []
                        )
                      }
                      classNamePrefix="react-select"
                      placeholder={i18n("select.placeholder")}
                      isDisabled={editingMode}
                    />
                  </FormGroup>
                </Col>
              </Row>
            )}
            <ShowAdvancedAssetFields>
              <Row>
                <Col xs={12}>
                  <CustomInput
                    name="custom-attribute-edit-iri"
                    label={i18n("asset.iri")}
                    onChange={onIriChange}
                    value={iri}
                    help={i18n("asset.create.iri.help")}
                    disabled={editingMode}
                  />
                </Col>
              </Row>
            </ShowAdvancedAssetFields>
            <Row>
              <Col md={12}>
                <ButtonToolbar className="d-flex justify-content-center mt-4">
                  <Button
                    id="custom-attribute-edit-submit"
                    color="success"
                    onClick={onSave}
                    size="sm"
                    disabled={isLanguageBlank(primaryLanguage, label)}
                  >
                    {i18n("save")}
                  </Button>
                  <Button
                    id="custom-attribute-edit-cancel"
                    color="outline-dark"
                    size="sm"
                    onClick={onCancel}
                  >
                    {i18n("cancel")}
                  </Button>
                </ButtonToolbar>
              </Col>
            </Row>
          </Form>
        </CardBody>
      </Card>
    </>
  );
};
