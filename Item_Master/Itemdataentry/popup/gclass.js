import React, { Component } from "react";
import { NormalButton, NormalCheckbox, NormalInput } from "component/common";
import { withTranslation } from "react-i18next";
import { NewItemClasses, ItemClasses } from "redux/actions/Backend";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Toast } from "service/toast";

export default class ClasspopupClass extends Component {
  state = {
    code: null,
    desc: null,
    checked: true,
  };
  componentDidMount = () => {
    this.listofclass({});
  };

  listofclass = async () => {
    let { code, te } = this.state;
    await this.props.ItemClasses().then((res) => {
      if (res.length > 0) {
        te = res[res.length - 1].itmCode;
        code = Number(te) + 1;
      } else {
        code = 1;
      }
      this.setState({
        code,
      });
    });
  };

  updateState = (data) => {
    if (this.state.isMounted) this.setState(data);
  };

  Addnewclass = async () => {
    let { code, desc, checked } = this.state;

    if (desc == null) {
      Toast({
        type: "error",
        message: "Please check required field",
      });
    } else {
      let newclass = {
        itmCode: code,
        itmDesc: desc,
        itmIsactive: checked,
      };
      await this.props
        .NewItemClasses(newclass)
        .then((data) => {
          code = "";
          desc = "";
          this.setState({ code, desc });
          this.props.handleModal();
          this.props.handlelist();
        })
        .catch((e) => console.log(e));
    }
  };

  temp = ({ target: { value, name } }) => {
    console.log(value, name);
    let { code, desc, checked } = this.state;
    if (name == "code") {
      code = value;
      this.setState({ code });
    }
    if (name == "desc") {
      desc = value;
      this.setState({ desc });
    }
    if (name == "checked") {
      checked = value;
      this.setState({ checked });
    }
  };
  render() {
    let { t } = this.props;
    let { code, desc, checked } = this.state;
    return (
      <div>
        <h6>Add Class</h6>
        <div className="d-flex mt-3">
          <div className="col-4 mt-3">
            <span>Code</span>
            <span style={{ color: "red" }}>*</span>
            <NormalInput
              value={code}
              name="code"
              onChange={this.temp}
              type="number"
              disabled={true}
            />
          </div>

          <div className="col-4 mt-3">
            <span>Description</span>
            <span style={{ color: "red" }}>*</span>
            <NormalInput value={desc} name="desc" onChange={this.temp} />
          </div>
          <div className="col-4 mt-3">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox checked={checked} />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {t("Active")}
              </p>
            </div>
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
              onClick={() => this.Addnewclass()}
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
      NewItemClasses,
      ItemClasses,
    },
    dispatch
  );
};

export const Classpopup = withTranslation()(
  connect(null, mapDispatchToProps)(ClasspopupClass)
);
