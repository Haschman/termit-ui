import React, { useState } from "react";
import WindowTitle from "../../misc/WindowTitle";
import { useI18n } from "../../hook/useI18n";
import { Card, CardBody, Col, Row } from "reactstrap";
import SearchParam, { MatchType } from "../../../model/search/SearchParam";
import VocabularyUtils from "../../../util/VocabularyUtils";
import TextFacet from "./TextFacet";
import { FacetedSearchResult } from "../../../model/search/FacetedSearchResult";
import { ThunkDispatch } from "../../../util/Types";
import { useDispatch } from "react-redux";
import { executeFacetedTermSearch } from "../../../action/SearchActions";
import { trackPromise } from "react-promise-tracker";
import PromiseTrackingMask from "../../misc/PromiseTrackingMask";
import FacetedSearchResults from "./FacetedSearchResults";
import "./FacetedSearch.scss";
import "../label/Search.scss";
import TermTypeFacet from "./TermTypeFacet";
import VocabularyFacet from "./VocabularyFacet";
import SimplePagination from "../../dashboard/widget/lastcommented/SimplePagination";
import Constants from "../../../util/Constants";
import TermStateFacet from "./TermStateFacet";
import { useDebouncedCallback } from "use-debounce";
import { CustomAttributeFacets } from "./CustomAttributeFacets";
import { aggregateSearchParams, createSearchParam } from "./FacetedSearchUtil";
import { RdfProperty } from "../../../model/RdfsResource";

const RESULT_PAGE_SIZE = 10;

const FacetedSearch: React.FC = () => {
  const { i18n } = useI18n();
  const dispatch: ThunkDispatch = useDispatch();
  const [page, setPage] = useState(0);
  const [params, setParams] = useState<{ [key: string]: SearchParam }>({});
  const [results, setResults] = React.useState<FacetedSearchResult[] | null>(
    null
  );

  const onChange = (value: SearchParam, debounce: boolean = false) => {
    const change = {};
    change[value.property] = value;
    setParams({ ...params, ...change });
    setPage(0);
    if (
      (value.matchType === MatchType.IRI ||
        (value.value.length > 0 && value.value[0].length === 0)) &&
      !debounce
    ) {
      runSearch({ ...params, ...change }, page);
    } else {
      debouncedSearch({ ...params, ...change }, page);
    }
  };
  const onPageChange = (page: number) => {
    setPage(page);
    runSearch(params, page);
  };
  const runSearch = React.useCallback(
    (params: {}, page: number) => {
      const sp = aggregateSearchParams(params);
      if (sp.length === 0) {
        setPage(0);
        setResults(null);
        return;
      }
      trackPromise(
        dispatch(
          executeFacetedTermSearch(sp, {
            page,
            size: RESULT_PAGE_SIZE,
          })
        ),
        "faceted-search"
      ).then((res) => setResults(res));
    },
    [dispatch, setPage, setResults]
  );
  const debouncedSearch = useDebouncedCallback((params: {}, page: number) => {
    runSearch(params, page);
  }, Constants.SEARCH_DEBOUNCE_DELAY);

  return (
    <div id="faceted-search" className="relative">
      <WindowTitle title={i18n("search.tab.facets")} />
      <PromiseTrackingMask area="faceted-search" />
      <Card className="mb-0">
        <CardBody>
          <Row>
            <Col xl={4} xs={6}>
              <VocabularyFacet
                value={
                  params[VocabularyUtils.IS_TERM_FROM_VOCABULARY] ||
                  createSearchParam(
                    new RdfProperty({
                      iri: VocabularyUtils.IS_TERM_FROM_VOCABULARY,
                      range: { iri: VocabularyUtils.VOCABULARY },
                    })
                  )
                }
                onChange={onChange}
              />
            </Col>
            <Col xl={4} xs={6}>
              <TermTypeFacet
                value={
                  params[VocabularyUtils.RDF_TYPE] ||
                  createSearchParam(
                    new RdfProperty({
                      iri: VocabularyUtils.RDF_TYPE,
                      range: { iri: VocabularyUtils.RDFS_RESOURCE },
                    })
                  )
                }
                onChange={onChange}
              />
            </Col>
            <Col xl={4} xs={6}>
              <TermStateFacet
                value={
                  params[VocabularyUtils.HAS_TERM_STATE] ||
                  createSearchParam(
                    new RdfProperty({
                      iri: VocabularyUtils.HAS_TERM_STATE,
                      range: { iri: VocabularyUtils.RDFS_RESOURCE },
                    })
                  )
                }
                onChange={onChange}
              />
            </Col>
          </Row>
          <Row>
            <Col xl={4} xs={6}>
              <TextFacet
                id="faceted-search-notation"
                label={i18n("term.metadata.notation.label")}
                value={
                  params[VocabularyUtils.SKOS_NOTATION] ||
                  createSearchParam(
                    new RdfProperty({
                      iri: VocabularyUtils.SKOS_NOTATION,
                      range: { iri: VocabularyUtils.XSD_STRING },
                    }),
                    undefined,
                    MatchType.EXACT_MATCH
                  )
                }
                onChange={onChange}
              />
            </Col>
            <Col xl={4} xs={6}>
              <TextFacet
                id="faceted-search-examples"
                label={i18n("term.metadata.example.label")}
                value={
                  params[VocabularyUtils.SKOS_EXAMPLE] ||
                  createSearchParam(
                    new RdfProperty({
                      iri: VocabularyUtils.SKOS_EXAMPLE,
                      range: { iri: VocabularyUtils.XSD_STRING },
                    })
                  )
                }
                onChange={onChange}
              />
            </Col>
          </Row>
          <CustomAttributeFacets values={params} onChange={onChange} />
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          {results && <FacetedSearchResults results={results} />}
          {results && (
            <SimplePagination
              page={page}
              setPage={onPageChange}
              pageSize={RESULT_PAGE_SIZE}
              itemCount={results.length === 0 ? 0 : RESULT_PAGE_SIZE}
              className="mt-3"
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default FacetedSearch;
