import React from "react";
import { FormGroup } from "reactstrap";
import CustomCheckBoxInput from "../../misc/CustomCheckboxInput";
import SearchParam from "../../../model/search/SearchParam";
import Utils from "../../../util/Utils";

export const BooleanFacet: React.FC<{
  id: string;
  label: string;
  value: SearchParam;
  onChange: (value: SearchParam) => void;
}> = ({ id, label, value, onChange }) => {
  const checked =
    Utils.sanitizeArray(value.value).length > 0
      ? value.value[0] === true
      : false;
  // TODO We need to be able to set the value to undefined, so we can clear the facet - this can be solved by having facets available on select - deselecting the facet would clear it
  return (
    <FormGroup>
      <CustomCheckBoxInput
        id={id}
        label={label}
        checked={checked}
        onChange={() => onChange({ ...value, value: [!checked] })}
        className="relative ml-0"
      />
    </FormGroup>
  );
};
