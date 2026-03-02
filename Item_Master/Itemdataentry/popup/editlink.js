import React, { Component } from "react";
import { NormalButton, NormalInput } from "component/common";
import { withTranslation } from "react-i18next";
import { updateCommon } from "redux/actions/Backend";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Toast } from "service/toast";

export default class EditlinkpopupClass extends Component {
  state = {
    linkcode: this.props.code,
    linkdesc: this.props.name,
    itemCode: this.props.itemCode,
  };
  handleinput = ({ target: { value, name } }) => {
    console.log(this.props.name);

    let { linkcode, linkdesc } = this.state;
    if (name == "linkcode") {
      linkcode = value;
      this.setState({ linkcode });
    }
    if (name == "linkdesc") {
      linkdesc = value;
      this.setState({ linkdesc });
    }
  };
  handlesubmit = async () => {
    let { linkcode, linkdesc, itemCode } = this.state;
    let { updateId } = this.props;
    if (linkdesc == " ") {
      Toast({
        type: "error",
        message: "Please check required field",
      });
    } else {
      let newlist = {
        linkCode: linkcode,
        itemCode: itemCode,
        linkDesc: linkdesc,
        linkFactor: 0,
        linkType: "",
        itmIsactive: false,
        rptCodeStatus: false,
      };
      await this.props
        .updateCommon(
          `ItemLinks/update?where=%7B%22itmId%22%3A%22${updateId}%22%7D
      `,
          newlist
        )
        .then((data) => {});

      this.props.handleModal();
      this.props.listoflinklist();
    }
  };

  render() {
    let { linkcode, linkdesc } = this.state;

    return (
      <div>
        <h6>Edit Link</h6>
        <div className="d-flex mt-3">
          <div className="col-6 mt-3">
            <p>Link Code</p>
            <NormalInput
              onChange={this.handleinput}
              value={linkcode}
              name="linkcode"
            />
          </div>
          <div className="col-6 mt-3">
            <span>Link Description</span>
            <span style={{ color: "red" }}>*</span>
            <NormalInput
              onChange={this.handleinput}
              value={linkdesc}
              name="linkdesc"
            />
          </div>
        </div>
        <div className="d-flex mt-3 justify-content-between">
          <div className="pl-2">
            <NormalButton
              mainbg={true}
              label={"Cancel"}
              onClick={() => this.props.handleModal()}
            />
          </div>
          <div className="pr-2">
            <NormalButton
              mainbg={true}
              label={"Submit"}
              onClick={() => this.handlesubmit()}
            />
          </div>
        </div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      updateCommon,
    },
    dispatch
  );
};
export const Editlinkpopup = withTranslation()(
  connect(null, mapDispatchToProps)(EditlinkpopupClass)
);
