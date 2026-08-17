import React, { Component } from "react";
import {
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
  ItemSupplies,
  updateCommon,
} from "redux/actions/Backend";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Toast } from "service/toast";
import moment from "moment";

export default class EditVendordetailsClass extends Component {
  state = {
    itemId: null,
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
  };

  componentDidMount = () => {
    let { itemId } = this.state;
    itemId = window.location.pathname.split("/")[4];
    this.setState({ itemId });
    console.log(itemId);
    this.Listofvendors(itemId);
  };

  Listofvendors = async (code) => {
    let {
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
      temp,
    } = this.state;

    await this.props.ItemSupplies().then((res) => {
      let objIndex = res.findIndex((obj) => obj.splyCode == code);
      console.log(objIndex);
      temp = res[objIndex];
      this.setState({
        temp,
      });
      console.log(temp);
      Ac_code = temp.accountNumber;
      sup_name = temp.supplydesc;
      //slpdate = temp.splyDate;
      sup_att = temp.splyAttn;
      address1 = temp.splyAddr1;
      address2 = temp.splyAddr2;
      address3 = temp.splyAddr3;
      postcode = temp.splyPoscd;
      cstate = temp.splyState;
      city = temp.splyCity;
      country = temp.splyCntry;
      maddress1 = temp.splymaddr1;
      maddress2 = temp.splymaddr2;
      maddress3 = temp.splymaddr3;
      mpostcode = temp.splymposcd;
      mcstate = temp.splymstate;
      mcity = temp.splymcity;
      mcountry = temp.splymcntry;
      tele_no = temp.splyTelno;
      fax_no = temp.splyFaxno;
      mtele_no = temp.splyTerm;
      checked = temp.splyactive;
      mfax_no = temp.splyComm;
      this.setState({
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
      });
    });
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
      this.setState({ slpdate });
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

  Addnew = async () => {
    let {
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
    } = this.state;
    if (sup_name == null || slpdate == null) {
      Toast({
        type: "error",
        message: "Please check required field",
      });
    } else {
      let newequiment = {
        splyCode: this.state.itemId,
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
        splyTerm: mtele_no,
        splyLimit: 0,
        splyBal: 0,
        splyactive: checked,
        splyComm: mfax_no,
        firstName: "",
        netseq: 0,
        createUser: "",
        createDate: new Date(),
        accountNumber: Ac_code,
        numberOfOpenPOs: 0,
        numberOfTotalPOs: 0,
      };
      await this.props
        .updateCommon(
          `ItemSupplies/update?where=%7B%22splyCode%22%3A%20%22${this.state.itemId}%22%7D

    `,
          newequiment
        )
        .then((data) => {
          this.handleimput();
          this.props.history.goBack();
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
    } = this.state;
    return (
      <div className="bg-white ">
        <div className="col-md-12 mt-3 d-flex align-items-center">
          <div className="detail d-flex ">
            <p
              className="category"
              onClick={() => this.props.history.push("/admin/backend")}
            >
              {t("Master Data")}
            </p>
            <i className="icon-right mx-md-3"></i>
            <p
              className="sub-category"
              onClick={() => this.props.history.push("/admin/backend")}
            >
              {t("Vendor List ")}
            </p>
            <i className="icon-right mx-md-3"></i>
            <p className="sub-category">{t("Operation")}</p>
          </div>
        </div>
        <div className="container-fluid bg-white">
          <h5 className="mt-3 ml-md-3 label-head text-center text-md-left">
            Vendor{" "}
          </h5>
          <div className="d-flex mt-3">
            <div className="col-12 col-md-6">
              <span>Code</span>
              <span style={{ color: "red" }}>*</span>
              <NormalInput
                value={this.state.itemId}
                name="code"
                onChange={this.temp}
                disabled
              />
            </div>
            <div className="col-12 col-md-6">
              <p>Account No</p>
              <NormalInput
                value={Ac_code}
                name="Ac_code"
                onChange={this.temp}
              />
            </div>
          </div>
          <div className="d-flex mt-3">
            <div className="col-12 col-md-6">
              <span>Date</span>
              <span style={{ color: "red" }}>*</span>
              <NormalDate value={slpdate} onChange={this.temp} name="date" />
            </div>
            <div className="col-12 col-md-6">
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
            <div className="col-12 col-md-6">
              <div className="d-flex mt-4 ml-3">
                <NormalCheckbox
                  checked={checked}
                  name="checked"
                  onChange={this.temp}
                />
                <p>{t("Supplier is currently active")}</p>
              </div>
            </div>
            <div className="col-12 col-md-6">
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
            <div className="col-12 col-md-6">
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
            <div className="col-12 col-md-1 copybutton">
              <button onClick={() => this.copyaddress()} className="mt-5">
                <AiOutlineDoubleRight />
              </button>
            </div>
            <div className="col-12 col-md-5">
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
          <div className="mt-3 col-12 col-md-2">
            <NormalButtonBackend
              mainbg={true}
              label={"Update"}
              onClick={() => this.Addnew()}
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
      NewItemSupplies,
      ItemSupplies,
      updateCommon,
    },
    dispatch
  );
};

export const EditVendor = withTranslation()(
  connect(null, mapDispatchToProps)(EditVendordetailsClass)
);
