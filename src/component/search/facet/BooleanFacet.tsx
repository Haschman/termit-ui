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
  const hasValue = Utils.sanitizeArray(value.value).length > 0;
  const checked = hasValue ? value.value[0] === true : false;

  const handleToggle = () => {
    if (!hasValue || value.value[0] === false) {
      onChange({ ...value, value: [true] });
    } else {
      onChange({ ...value, value: [false] });
    }
  };

  return (
    <FormGroup>
      <CustomCheckBoxInput
        id={id}
        label={label}
        checked={checked}
        onChange={handleToggle}
        className="relative ml-0"
      />
    </FormGroup>
  );
};
