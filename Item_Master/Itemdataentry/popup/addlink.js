import React, { Component } from "react";
import { NormalButtonBackend, NormalInput } from "component/common";
import { withTranslation } from "react-i18next";
import { NewItemLinks, ItemLinks } from "redux/actions/Backend";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Toast } from "service/toast";

export default class NewlinkpopupClass extends Component {
  state = {
    linkcode: "",
    linkdesc: this.props.linkDesc,
    itemcode: this.props.itemCode,
  };

  /* Handle Input */
  handleinput = ({ target: { value, name } }) => {
    let { linkcode, linkdesc, itemcode } = this.state;
    if (name === "linkcode") {
      linkcode = value;
      this.setState({ linkcode });
    }
    if (name === "linkdesc") {
      linkdesc = value;
      this.setState({ linkdesc });
    }
    if (name === "itemcode") {
      itemcode = value;
      this.setState({ itemcode });
    }
  };

  /* Data submit function */
  handlesubmit = async () => {
    let { linkcode, linkdesc, itemcode, objIndex } = this.state;
    if (linkdesc == null || linkdesc == "") {
      Toast({
        type: "error",
        message: "Please check required field",
      });
    } else {
      await this.props.ItemLinks().then((res) => {
        objIndex = res.findIndex((obj) => obj.linkCode === linkcode);
      });
      if (objIndex == -1) {
        let newlist = {
          linkCode: linkcode,
          linkDesc: linkdesc,
          itemCode: itemcode,
          linkFactor: 0,
          linkType: "",
          itmIsactive: true,
          rptCodeStatus: false,
        };
        await this.props
          .NewItemLinks(newlist)
          .then((data) => {
            this.props.handleModal();
            this.props.Listoflinklist();
          })

          .catch((e) => console.log(e));
      } else {
        Toast({
          type: "error",
          message: "Please check code is already present",
        });
      }
    }
  };

  render() {
    let { linkcode, linkdesc } = this.state;
    let { linkDesc } = this.props;
    return (
      <div>
        <div className="col-12 p-0">
          <div className="text-center">
            <h6>Add Link</h6>
          </div>
          <div className="d-md-flex col-12 mt-3">
            <div className="col-12 col-md-6 col-lg-6">
              <h6>Link Code</h6>
              <NormalInput
                onChange={this.handleinput}
                value={linkcode}
                name="linkcode"
              />
            </div>
            <div className="col-12 col-md-6 col-lg-6 mt-4 mt-md-0">
              <h6>
                Link Description <span style={{ color: "red" }}>*</span>
              </h6>
              <NormalInput
                onChange={this.handleinput}
                value={linkdesc}
                name="linkdesc"
                disabled={true}
              />
            </div>
          </div>
          <div className="d-flex mt-3 justify-content-between">
            <div className="col-12 col-md-4 col-lg-4">
              <NormalButtonBackend
                mainbg={true}
                label={"Cancel"}
                onClick={() => this.props.handleModal()}
              />
            </div>
            <div className="col-12 col-md-4 col-lg-4 mt-2 mt-md-0">
              <NormalButtonBackend
                mainbg={true}
                label={"Submit"}
                onClick={() => this.handlesubmit()}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      NewItemLinks,
      ItemLinks,
    },
    dispatch
  );
};
export const Newlinkpopup = withTranslation()(
  connect(null, mapDispatchToProps)(NewlinkpopupClass)
);
