import React from "react";
import SearchParam, { MatchType } from "../../../model/search/SearchParam";
import { useI18n } from "../../hook/useI18n";
import { useDispatch, useSelector } from "react-redux";
import TermItState from "../../../model/TermItState";
import { Col, Row } from "reactstrap";
import { RdfProperty } from "src/model/RdfsResource";
import VocabularyUtils from "../../../util/VocabularyUtils";
import { BooleanFacet } from "./BooleanFacet";
import Utils from "../../../util/Utils";
import { getLocalized } from "../../../model/MultilingualString";
import { getShortLocale } from "../../../util/IntlUtil";
import { TermSelectorFacet } from "./TermSelectorFacet";
import TextFacet from "./TextFacet";
import { ThunkDispatch } from "../../../util/Types";
import { getCustomAttributes } from "../../../action/AsyncActions";

export const CustomAttributeFacets: React.FC<{
  values: { [key: string]: SearchParam };
  onChange: (value: SearchParam) => void;
}> = ({ values, onChange }) => {
  const { locale } = useI18n();
  const dispatch: ThunkDispatch = useDispatch();
  const customAttributes = useSelector(
    (state: TermItState) => state.customAttributes
  );
  React.useEffect(() => {
    dispatch(getCustomAttributes());
  }, [dispatch]);
  const lang = getShortLocale(locale);

  return (
    <Row>
      {customAttributes
        .filter((att) => att.domainIri === VocabularyUtils.TERM)
        .map((att) => (
          <Col xl={4} xs={6}>
            {renderFacet(
              att,
              values[att.iri] || searchParam(att),
              onChange,
              lang
            )}
          </Col>
        ))}
    </Row>
  );
};

function renderFacet(
  att: RdfProperty,
  value: SearchParam,
  onChange: (value: SearchParam, debounce?: boolean) => void,
  lang: string
) {
  const hashCode = Utils.hashCode(att.iri).toString();
  switch (att.rangeIri) {
    case VocabularyUtils.XSD_BOOLEAN:
      return (
        <BooleanFacet
          id={hashCode}
          key={hashCode}
          label={getLocalized(att.label, lang)}
          value={value}
          onChange={onChange}
        />
      );
    case VocabularyUtils.TERM:
      return (
        <TermSelectorFacet
          id={hashCode}
          key={hashCode}
          label={getLocalized(att.label, lang)}
          value={value}
          onChange={onChange}
        />
      );
    case VocabularyUtils.XSD_STRING:
      return (
        <TextFacet
          id={hashCode}
          key={hashCode}
          label={getLocalized(att.label, lang)}
          value={value}
          onChange={onChange}
        />
      );
    case VocabularyUtils.RDFS_RESOURCE:
      return (
        <TextFacet
          id={hashCode}
          key={hashCode}
          label={getLocalized(att.label, lang)}
          value={value}
          onChange={(v) => onChange(v, true)}
        />
      );
    default:
      return null;
  }
}

function searchParam(att: RdfProperty, value?: SearchParam): SearchParam {
  if (value) {
    return value;
  }
  switch (att.rangeIri) {
    case VocabularyUtils.XSD_BOOLEAN:
      return {
        property: att.iri,
        matchType: MatchType.EXACT_MATCH,
        value: [false],
      };
    case VocabularyUtils.TERM:
      return { property: att.iri, matchType: MatchType.IRI, value: [] };
    case VocabularyUtils.RDFS_RESOURCE:
      return {
        property: att.iri,
        matchType: MatchType.IRI,
        value: [],
      };
    default:
      return {
        property: att.iri,
        matchType: MatchType.SUBSTRING,
        value: [],
      };
  }
}
