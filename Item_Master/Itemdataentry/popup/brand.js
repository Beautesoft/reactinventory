import React, { Component } from "react";
import { NormalButton, NormalCheckbox, NormalInput } from "component/common";
import { withTranslation } from "react-i18next";
import { NewItemBrands, ItemBrands } from "redux/actions/Backend";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Toast } from "service/toast";

export default class BrandpopupClass extends Component {
  state = {
    code: null,
    desc: null,
    active: true,
    Show_retail: false,
    Show_voucher: false,
    Show_prepaid: false,
  };

  componentDidMount = () => {
    this.listofbrand({});
  };

  listofbrand = async () => {
    let { code, te } = this.state;
    await this.props.ItemBrands().then((res) => {
      if (res.length > 0) {
        te = res[res.length - 1].itmCode;
        code = Number(te) + 1;
      } else {
        code = 100001;
      }
      this.setState({
        code,
      });
    });
  };

  temp = ({ target: { value, name } }) => {
    console.log(value, name);
    let { code, desc, active, Show_retail, Show_voucher, Show_prepaid } =
      this.state;
    if (name == "code") {
      code = value;
      this.setState({ code });
    }
    if (name == "desc") {
      desc = value;
      this.setState({ desc });
    }
    if (name == "active") {
      active = value;
      this.setState({ active });
    }
    if (name == "retails") {
      Show_retail = value;
      this.setState({ Show_retail });
    }
    if (name == "voucher") {
      Show_voucher = value;
      this.setState({ Show_voucher });
    }
    if (name == "prepaid") {
      Show_prepaid = value;
      this.setState({ Show_prepaid });
    }
  };

  Addnewbrand = async () => {
    let { code, desc, active, Show_retail, Show_voucher, Show_prepaid } =
      this.state;
    if (desc == null) {
      Toast({
        type: "error",
        message: "Please check required field",
      });
    } else {
      let newbrand = {
        itmCode: code,
        itmDesc: desc,
        itmStatus: active,
        voucherBrand: Show_voucher,
        voucherForSales: Show_voucher,
        retailProductBrand: Show_retail,
        prepaidBrand: Show_prepaid,
      };
      await this.props
        .NewItemBrands(newbrand)
        .then((data) => {
          code = "";
          desc = "";
          active = true;
          Show_prepaid = false;
          Show_retail = false;
          Show_voucher = false;
          this.setState({
            code,
            desc,
            active,
            Show_voucher,
            Show_retail,
            Show_prepaid,
          });
          this.props.handleModal();
          this.props.handlelist();
        })

        .catch((e) => console.log(e));
    }
  };
  render() {
    let { t } = this.props;
    let { code, desc, active, Show_prepaid, Show_retail, Show_voucher } =
      this.state;
    return (
      <div>
        <h6>Add Brand</h6>
        <div className="mt-4 d-flex">
          <div className="col-6">
            <p>Code</p>
            <NormalInput
              value={code}
              name="code"
              type="number"
              onChange={this.temp}
              disabled={true}
            />
          </div>
          <div className="col-6">
            <span>Description</span>
            <span style={{ color: "red" }}>*</span>
            <NormalInput value={desc} name="desc" onChange={this.temp} />
          </div>
        </div>
        <div className="mt-2 d-flex">
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox checked={active} onChange={this.temp} />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {t("Brand is Currently Active")}
              </p>
            </div>
          </div>
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox
                  name="retails"
                  checked={Show_retail}
                  onChange={this.temp}
                />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {t("Show on Retail")}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-2 d-flex">
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox
                  name="prepaid"
                  checked={Show_prepaid}
                  onChange={this.temp}
                />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {t("Show on Prepaid")}
              </p>
            </div>
          </div>
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox
                  name="voucher"
                  checked={Show_voucher}
                  onChange={this.temp}
                />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {t("Show on Voucher")}
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
              onClick={() => this.Addnewbrand()}
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
      NewItemBrands,
      ItemBrands,
    },
    dispatch
  );
};

export const Brandpopup = withTranslation()(
  connect(null, mapDispatchToProps)(BrandpopupClass)
);
