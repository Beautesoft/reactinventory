import React, { Component } from "react";
import {
  NormalButton,
  NormalCheckbox,
  NormalInput,
  NormalDate,
  NormalButtonBackend,
} from "component/common";
import "./style.scss";
import { withTranslation } from "react-i18next";
import { AiOutlineDoubleRight } from "react-icons/ai";
import {
  NewItemSupplies,
  getControlNoApi,
  UpdateControlNo,
  getBackendCommonApi,
  updateCommon,
} from "redux/actions/Backend";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Toast } from "service/toast";
import moment from "moment";
import { ItemSupplies } from "redux/actions/Backend";
export default class VendordetailsClass extends Component {
  state = {
    code: null,
    Ac_code: null,
    sup_att: null,
    sup_name: null,
    address1: null,
    address2: null,
    address3: null,
    postcode: null,
    city: null,
    cstate: null,
    country: null,
    tele_no: null,
    fax_no: null,
    maddress1: null,
    maddress2: null,
    maddress3: null,
    mpostcode: null,
    mcity: null,
    mcstate: null,
    mcountry: null,
    mtele_no: 0,
    mfax_no: 0,
    checked: true,
    slpdate: new Date(),
    menuCode: null,
    controlNo: null,
    controlId: null,
  };

  temp = ({ target: { value, name } }) => {
    console.log(value, name);
    let { code, Ac_code, sup_name, sup_att, checked, slpdate } = this.state;
    if (name == "code") {
      code = value;
      this.setState({ code });
    }
    if (name == "Ac_code") {
      Ac_code = value;
      this.setState({ Ac_code });
    }
    if (name == "sup_name") {
      sup_name = value;
      this.setState({ sup_name });
    }
    if (name == "sup_att") {
      sup_att = value;
      this.setState({ sup_att });
    }
    if (name == "date") {
      slpdate = value;
      // slpdate = moment(slpdate).format('YYYY-MM-DD'); // store localTime
      //  slpdate = slpdate + "T00:00:00.000Z";
      this.setState({ slpdate });
      console.log(slpdate);
    }
    if (name == "checked") {
      checked = value;
      this.setState({ checked });
    }
  };

  tempone = ({ target: { value, name } }) => {
    console.log(value, name);
    let {
      address1,
      address2,
      address3,
      city,
      cstate,
      country,
      tele_no,
      fax_no,
      postcode,
      maddress1,
      maddress2,
      maddress3,
      mcity,
      mcstate,
      mcountry,
      mtele_no,
      mfax_no,
      mpostcode,
    } = this.state;
    if (name == "address1") {
      address1 = value;
      this.setState({ address1 });
    }
    if (name == "address2") {
      address2 = value;
      this.setState({ address2 });
    }
    if (name == "address3") {
      address3 = value;
      this.setState({ address3 });
    }
    if (name == "city") {
      city = value;
      this.setState({ city });
    }
    if (name == "cstate") {
      cstate = value;
      this.setState({ cstate });
    }
    if (name == "country") {
      country = value;
      this.setState({ country });
    }
    if (name == "tele_no") {
      tele_no = value;
      this.setState({ tele_no });
    }
    if (name == "fax_no") {
      fax_no = value;
      this.setState({ fax_no });
    }
    if (name == "postcode") {
      postcode = value;
      this.setState({ postcode });
    }
    if (name == "maddress1") {
      maddress1 = value;
      this.setState({ maddress1 });
    }
    if (name == "maddress2") {
      maddress2 = value;
      this.setState({ maddress2 });
    }
    if (name == "maddress3") {
      maddress3 = value;
      this.setState({ maddress3 });
    }
    if (name == "mcity") {
      mcity = value;
      this.setState({ mcity });
    }
    if (name == "mcstate") {
      mcstate = value;
      this.setState({ mcstate });
    }
    if (name == "mcountry") {
      mcountry = value;
      this.setState({ mcountry });
    }
    if (name == "mtele_no") {
      mtele_no = value;
      this.setState({ mtele_no });
    }
    if (name == "mfax_no") {
      mfax_no = value;
      this.setState({ mfax_no });
    }
    if (name == "mpostcode") {
      mpostcode = value;
      this.setState({ mpostcode });
    }
  };
  componentDidMount = () => {
    this.Listofvendors({});
    this.controlNoList();
  };
  controlNoList = async () => {
    let { controlNo, menuCode, controlId } = this.state;
    console.log(controlNo, "controlNo");
    let siteCode = this.props.tokenDetails.site_code;
    await this.props
      .getBackendCommonApi(
        `ControlNos?filter=%7B%22where%22%3A%7B%22controlDescription%22%3A%22Supplier%20Code%22%2C%22siteCode%22%3A%22${siteCode}%22%7D%7D`
      )
      .then((list) => {
        console.log(list, "list");
        let newMenu = `${list[0]?.controlPrefix}${list[0]?.controlNo}`;
        controlId = list[0]?.controlId;
        console.log(newMenu, "newMenu");
        this.setState(
          {
            controlNo: list[0].controlNo,
            menuCode: newMenu,
            controlId,
          },
          () => {
            console.log(menuCode, "menuCode");
            console.log(controlNo, "controlNo");
          }
        );
      });
  };
  Listofvendors = async () => {
    //this.updateState({ is_loading: true });
    await this.props.ItemSupplies().then((res) => {
      console.log(res, "response");
      let { List, pageCount, slice, pageMeta, count, code } = this.state;
      if (res.length > 0) {
        code = res[res.length - 1].splyCode;
        console.log(code, "codde");
        code = (Number(code) + 1).toString().padStart(3, "0");
      } else {
        code = "001";
      }
      List = res;
      slice = List.slice(
        this.state.offset,
        this.state.offset + this.state.perPage
      );
      pageCount = Math.ceil(List.length / this.state.perPage);
      console.log(List);
      this.setState({
        code,
      });
      console.log(code, "codeNo");
    });
  };

  Addnew = async () => {
    let {
      code,
      Ac_code,
      sup_name,
      sup_att,
      slpdate,
      address1,
      address2,
      address3,
      city,
      cstate,
      country,
      tele_no,
      fax_no,
      postcode,
      maddress1,
      maddress2,
      maddress3,
      mcity,
      mcstate,
      mcountry,
      mtele_no,
      mfax_no,
      checked,
      mpostcode,
      controlNo,
      menuCode,
    } = this.state;
    if (code == null || sup_name == null || slpdate == null) {
      Toast({
        type: "error",
        message: "Please check required field",
      });
    } else {
      let newequiment = {
        splyCode: menuCode,
        supplydesc: sup_name,
        splyDate: moment(slpdate).format("YYYY-MM-DD") + "T00:00:00.000Z",
        splyAttn: sup_att,
        splyIc: "",
        splyType: "",
        splyAddr1: address1,
        splyAddr2: address2,
        splyAddr3: address3,
        splyPoscd: postcode,
        splyState: cstate,
        splyCity: city,
        splyCntry: country,
        splymaddr1: maddress1,
        splymaddr2: maddress2,
        splymaddr3: maddress3,
        splymposcd: mpostcode,
        splymstate: mcstate,
        splymcity: mcity,
        splymcntry: mcountry,
        splyTelno: tele_no,
        splyFaxno: fax_no,
        splyRemk1: "",
        splyRemk2: "",
        splyRemk3: "",
        splyTerm: 0,
        splyLimit: 0,
        splyBal: 0,
        splyactive: checked,
        splyComm: 0,
        firstName: "",
        netseq: 0,
        createUser: "",
        createDate: new Date(),
        accountNumber: Ac_code,
        numberOfOpenPOs: 0,
        numberOfTotalPOs: 0,
      };
      console.log(controlNo, "control");
      let newControlNo = {
        controlNo: Number(controlNo) + 1,
      };
      let { controlId } = this.state;

      await this.props
        .NewItemSupplies(newequiment)
        .then(async (data) => {
          this.handleimput();
          await this.props
            .UpdateControlNo(
              `ControlNos/update?where=%7B%22controlId%22%3A%20${controlId}%7D`,
              newControlNo
            )
            .then(() => {
              this.controlNoList();
              this.props.history.goBack();
            });
        })
        .catch((e) => console.log(e));
    }
  };

  handleimput = () => {
    let {
      code,
      Ac_code,
      sup_name,
      sup_att,
      slpdate,
      address1,
      address2,
      address3,
      city,
      cstate,
      country,
      tele_no,
      fax_no,
      postcode,
      maddress1,
      maddress2,
      maddress3,
      mcity,
      mcstate,
      mcountry,
      mtele_no,
      mfax_no,
      mpostcode,
    } = this.state;
    code = "";
    Ac_code = "";
    sup_att = "";
    sup_name = "";
    address1 = "";
    address2 = "";
    address3 = "";
    postcode = "";
    city = "";
    cstate = "";
    country = "";
    tele_no = "";
    fax_no = "";
    maddress1 = "";
    maddress2 = "";
    maddress3 = "";
    mpostcode = "";
    mcity = "";
    mcstate = "";
    mcountry = "";
    mtele_no = "";
    mfax_no = "";
    slpdate = new Date();
    this.setState({
      code,
      Ac_code,
      sup_name,
      sup_att,
      slpdate,
      address1,
      address2,
      address3,
      city,
      cstate,
      country,
      tele_no,
      fax_no,
      postcode,
      maddress1,
      maddress2,
      maddress3,
      mcity,
      mcstate,
      mcountry,
      mtele_no,
      mfax_no,
      mpostcode,
    });
  };

  copyaddress = () => {
    let {
      address1,
      address2,
      address3,
      city,
      cstate,
      country,
      tele_no,
      fax_no,
      postcode,
      maddress1,
      maddress2,
      maddress3,
      mcity,
      mcstate,
      mcountry,
      mtele_no,
      mfax_no,
      mpostcode,
    } = this.state;
    maddress1 = address1;
    maddress2 = address2;
    maddress3 = address3;
    mcountry = country;
    mcity = city;
    mcstate = cstate;
    mpostcode = postcode;
    this.setState({
      maddress1,
      maddress2,
      maddress3,
      mcity,
      mcstate,
      mcountry,
      mpostcode,
    });
  };
  render() {
    let { t } = this.props;
    let {
      code,
      Ac_code,
      sup_name,
      sup_att,
      address1,
      address2,
      address3,
      city,
      cstate,
      country,
      tele_no,
      fax_no,
      postcode,
      maddress1,
      maddress2,
      checked,
      maddress3,
      mcity,
      mcstate,
      mcountry,
      mtele_no,
      mfax_no,
      mpostcode,
      slpdate,
      menuCode,
    } = this.state;
    return (
      <>
        <div className="col-md-12 d-flex align-items-center mt-3">
          <div className="detail d-flex">
            <p
              className="category"
              onClick={() => this.props.history.push("/admin/backend")}
            >
              {t("Master Data")}
            </p>
            <i className="icon-right mx-md-3 mt-2"></i>
            <p
              className="sub-category"
              onClick={() => this.props.history.push("/admin/backend")}
            >
              {t("Vendor List ")}
            </p>
            <i className="icon-right mx-md-3 mt-2"></i>
            <p className="sub-category">{t("Operation")}</p>
          </div>
        </div>
        <div className="container-fluid">
          <h5 className="mt-5" style={{ marginLeft: 15 }}>
            Vendor{" "}
          </h5>
          <div className="d-flex mt-5">
            <div className="col-6">
              <span>Code</span>
              <span style={{ color: "red" }}>*</span>
              <NormalInput
                value={menuCode}
                name="code"
                onChange={this.temp}
                disabled
              />
            </div>
            <div className="col-6">
              <p>Account No</p>
              <NormalInput
                value={Ac_code}
                name="Ac_code"
                onChange={this.temp}
              />
            </div>
          </div>
          <div className="d-flex mt-3">
            <div className="col-6">
              <span>Date</span>
              <span style={{ color: "red" }}>*</span>
              <NormalDate value={slpdate} onChange={this.temp} name="date" />
            </div>
            <div className="col-6">
              <span>Supplier Name</span>
              <span style={{ color: "red" }}>*</span>
              <NormalInput
                value={sup_name}
                name="sup_name"
                onChange={this.temp}
                placeholder="Enter Supplier Name"
              />
            </div>
          </div>
          <div className="d-flex mt-3">
            <div className="col-6">
              <div className="d-flex mt-4 ml-3">
                <NormalCheckbox
                  checked={checked}
                  name="checked"
                  onChange={this.temp}
                />
                <p>{t("Supplier is currently active")}</p>
              </div>
            </div>
            <div className="col-6">
              <p>Supplier Attn.</p>
              <NormalInput
                value={sup_att}
                name="sup_att"
                onChange={this.temp}
                placeholder="Enter Supplier Attn."
              />
            </div>
          </div>
          <div className="d-md-flex mt-4">
            <div className="col-md-5 col-12">
              <div className="mt-3">
                <span>Address</span>
                <NormalInput
                  value={address1}
                  name="address1"
                  onChange={this.tempone}
                  placeholder="Enter Address1"
                />
              </div>
              <div className="mt-3">
                <NormalInput
                  value={address2}
                  name="address2"
                  onChange={this.tempone}
                  placeholder="Enter Address2"
                />
              </div>
              <div className="mt-3">
                <NormalInput
                  value={address3}
                  name="address3"
                  onChange={this.tempone}
                  placeholder="Enter Address3"
                />
              </div>
              <div className="mt-3">
                <p>Postcode</p>
                <NormalInput
                  value={postcode}
                  name="postcode"
                  onChange={this.tempone}
                  placeholder="Enter postcode"
                />
              </div>
              <div className="mt-3">
                <span>City</span>
                <NormalInput
                  value={city}
                  name="city"
                  onChange={this.tempone}
                  placeholder="Enter city"
                />
              </div>
              <div className="mt-3">
                <p>State</p>
                <NormalInput
                  value={cstate}
                  name="cstate"
                  onChange={this.tempone}
                  placeholder="Enter State"
                />
              </div>
              <div className="mt-3">
                <span>Country</span>
                <NormalInput
                  value={country}
                  name="country"
                  onChange={this.tempone}
                  placeholder="Enter Country"
                />
              </div>
              <div className="mt-3">
                <p>Telephone No.</p>
                <NormalInput
                  value={tele_no}
                  name="tele_no"
                  onChange={this.tempone}
                  placeholder="Enter Telephone NO"
                />
              </div>
              <div className="mt-3">
                <p>Fax No.</p>
                <NormalInput
                  value={fax_no}
                  name="fax_no"
                  onChange={this.tempone}
                  placeholder="Enter Fax No"
                />
              </div>
            </div>
            <div className="col-12 col-md-2 copybutton mt-5">
              <button onClick={() => this.copyaddress()} className="mt-5 ml-5">
                <AiOutlineDoubleRight />
              </button>
            </div>
            <div className="col-md-5 col-12">
              <div className="mt-3">
                <span>Mailing Address</span>
                <NormalInput
                  value={maddress1}
                  name="maddress1"
                  onChange={this.tempone}
                  placeholder="Enter Address1"
                />
              </div>
              <div className="mt-3">
                <NormalInput
                  value={maddress2}
                  name="maddress2"
                  onChange={this.tempone}
                  placeholder="Enter Address2"
                />
              </div>
              <div className="mt-3">
                <NormalInput
                  value={maddress3}
                  name="maddress3"
                  onChange={this.tempone}
                  placeholder="Enter Address3"
                />
              </div>
              <div className="mt-3">
                <p>Postcode</p>
                <NormalInput
                  value={mpostcode}
                  name="mpostcode"
                  onChange={this.tempone}
                  placeholder="Enter postcode"
                />
              </div>
              <div className="mt-3">
                <span>City</span>
                <NormalInput
                  value={mcity}
                  name="mcity"
                  onChange={this.tempone}
                  placeholder="Enter City"
                />
              </div>
              <div className="mt-3">
                <p>State</p>
                <NormalInput
                  value={mcstate}
                  name="mcstate"
                  onChange={this.tempone}
                  placeholder="Enter State"
                />
              </div>
              <div className="mt-3">
                <span>Country</span>
                <NormalInput
                  value={mcountry}
                  name="mcountry"
                  onChange={this.tempone}
                  placeholder="Enter Country"
                />
              </div>
              <div className="mt-3">
                <p>Terms</p>
                <NormalInput
                  value={mtele_no}
                  name="mtele_no"
                  type="number"
                  onChange={this.tempone}
                  placeholder="Enter Terms"
                />
              </div>
              <div className="mt-3">
                <p>Commission</p>
                <NormalInput
                  value={mfax_no}
                  name="mfax_no"
                  onChange={this.tempone}
                  type="number"
                  placeholder="Enter Commission"
                />
              </div>
            </div>
          </div>
          <div className="mt-3 col-md-3">
            <NormalButtonBackend
              mainbg={true}
              label={"Add"}
              onClick={() => this.Addnew()}
            />
          </div>
        </div>
      </>
    );
  }
}
const mapStateToProps = (state) => ({
  tokenDetails: state.authStore.tokenDetails,
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      NewItemSupplies,
      ItemSupplies,
      getControlNoApi,
      UpdateControlNo,
      getBackendCommonApi,
      updateCommon,
    },
    dispatch
  );
};

export const Vendordetails = withTranslation()(
  connect(mapStateToProps, mapDispatchToProps)(VendordetailsClass)
);
