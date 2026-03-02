import React, { Component } from "react";
import {
  NormalButton,
  NormalDateTime,
  NormalSelect,
  NormalCheckbox,
  NormalInput,
} from "component/common";
import { withTranslation } from "react-i18next";
import { NewItemDepts, ItemDepts } from "redux/actions/Backend";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Toast } from "service/toast";
import "../style.scss";

export default class DepartmentpopupClass extends Component {
  state = {
    deptcode: null,
    desc: null,
    validityperiod: null,
    fesequence: null,
    option: [
      { label: " 1 Year", value: 1 },
      { label: " 2 Year", value: 2 },
      { label: " 3 Year", value: 3 },
      { label: "Unlimited", value: 4 },
    ],
    count: null,
    fdate: new Date(),
    tdate: new Date(),
    dept: true,
    cash: false,
    sales: false,
    retail: false,
    salon: false,
    service: false,
    voucher: false,
    prepaid: false,
    ftrial: false,
    max_Date: new Date(),
    depts: [],
  };
  componentDidMount = () => {
    this.listofdept({});
  };

  listofdept = async () => {
    let { deptcode, te } = this.state;

    await this.props.ItemDepts().then((res) => {
      if (res.length > 0) {
        te = res[res.length - 1].itmCode;
        deptcode = Number(te) + 1;
      } else {
        deptcode = 1;
      }
      this.setState({
        deptcode,
      });
    });
  };

  temp = ({ target: { value, name } }) => {
    console.log(value, name);
    let { deptcode, desc, count, fesequence, fdate, tdate, max_Date } =
      this.state;
    if (name == "deptcode") {
      deptcode = value;
      this.setState({ deptcode });
    }
    if (name == "desc") {
      desc = value;
      this.setState({ desc });
    }
    if (name == "count") {
      count = value;
      this.setState({ count });
      console.log(count);
      if (count == 1) {
        max_Date = new Date();
        max_Date.setFullYear(max_Date.getFullYear() + 1);
        console.log(max_Date);
        this.setState({ max_Date });
      } else if (count == 2) {
        max_Date = new Date();
        max_Date.setFullYear(max_Date.getFullYear() + 2);
        this.setState({ max_Date });
      } else if (count == 3) {
        max_Date = new Date();
        max_Date.setFullYear(max_Date.getFullYear() + 3);
        this.setState({ max_Date });
      } else {
        max_Date = new Date();
        max_Date.setFullYear(max_Date.getFullYear() + 978);
        this.setState({ max_Date });
      }
    }
    if (name == "fe") {
      fesequence = value;
      this.setState({ fesequence });
    }
    if (name == "fdate") {
      fdate = value;
      this.setState({ fdate });
    }
    if (name == "tdate") {
      tdate = value;
      this.setState({ tdate });
    }
  };

  tempone = ({ target: { value, name } }) => {
    console.log(value, name);
    let {
      dept,
      cash,
      sales,
      retail,
      salon,
      service,
      voucher,
      prepaid,
      ftrial,
    } = this.state;
    if (name == "dept") {
      dept = value;
      this.setState({ dept });
    }
    if (name == "cash") {
      cash = value;
      this.setState({ cash });
    }
    if (name == "sales") {
      sales = value;
      this.setState({ sales });
    }
    if (name == "retail") {
      retail = value;
      this.setState({ retail });
    }
    if (name == "salon") {
      salon = value;
      this.setState({ salon });
    }
    if (name == "service") {
      service = value;
      this.setState({ service });
    }
    if (name == "voucher") {
      voucher = value;
      this.setState({ voucher });
    }
    if (name == "prepaid") {
      prepaid = value;
      this.setState({ prepaid });
    }
    if (name == "ftrial") {
      ftrial = value;
      this.setState({ ftrial });
    }
  };
  Addnewequiment = async () => {
    let {
      deptcode,
      desc,
      count,
      fesequence,
      fdate,
      tdate,
      dept,
      cash,
      sales,
      retail,
      salon,
      service,
      voucher,
      prepaid,
      ftrial,
      objIndex,
    } = this.state;
    if (desc == null) {
      Toast({
        type: "error",
        message: "Please check required field",
      });
    } else {
      await this.props.ItemDepts().then((res) => {
        objIndex = res.findIndex((obj) => obj.itmCode == deptcode);
      });

      if (objIndex == -1) {
        let newdept = {
          itmCode: deptcode,
          itmDesc: desc,
          itmStatus: true,
          itmSeq: fesequence,
          allowcashsales: cash,
          itmShowonsales: sales,
          isfirsttrial: ftrial,
          isVoucher: voucher,
          isPrepaid: prepaid,
          isRetailproduct: retail,
          isSalonproduct: salon,
          isPackage: true,
          validityPeriod: count,
          isService: service,
          isCompound: true,
          deptPic: "string",
          vilidityFromDate: fdate,
          vilidityToDate: tdate,
          vilidityFromTime: fdate,
          vilidityToTime: tdate,
        };
        await this.props
          .NewItemDepts(newdept)
          .then((data) => {
            this.handleimput();
            this.props.handleModal();
            //  this.props.handlelist();
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

  handleimput = () => {
    let {
      deptcode,
      desc,
      count,
      fesequence,
      fdate,
      tdate,
      dept,
      cash,
      sales,
      retail,
      salon,
      service,
      voucher,
      prepaid,
      ftrial,
    } = this.state;

    deptcode = "";
    desc = "";
    count = "";
    fesequence = "";
    fdate = new Date();
    tdate = new Date();
    dept = false;
    cash = false;
    sales = false;
    retail = false;
    salon = false;
    service = false;
    voucher = false;
    prepaid = false;
    ftrial = false;
    this.setState({
      deptcode,
      desc,
      count,
      fesequence,
      fdate,
      tdate,
      dept,
      cash,
      sales,
      retail,
      salon,
      service,
      voucher,
      prepaid,
      ftrial,
    });
  };

  handleDatePick = (name, value) => {
    console.log(name, value);
    let { fdate, max_Date } = this.state;
    if ((name = "fdate")) {
      fdate = value;
    }
    if ((name = "tdate")) {
      max_Date = value;
    }
    this.setState({
      fdate,
      max_Date,
    });
  };
  render() {
    let { t } = this.props;
    let {
      deptcode,
      desc,
      fesequence,
      option,
      count,
      fdate,
      tdate,
      dept,
      cash,
      sales,
      retail,
      salon,
      service,
      voucher,
      prepaid,
      max_Date,
      ftrial,
    } = this.state;
    return (
      <div>
        <h6>Add Department</h6>
        <div className="d-flex mt-3">
          <div className="col-4 mt-3">
            <p>Department Code</p>
            <NormalInput
              onChange={this.temp}
              value={deptcode}
              type="number"
              name="deptcode"
            />
          </div>

          <div className="col-4 mt-3">
            <span>Description</span>
            <span style={{ color: "red" }}>*</span>
            <NormalInput onChange={this.temp} value={desc} name="desc" />
          </div>
          <div className="col-4 mt-3">
            <p>Validity Period</p>
            <NormalSelect
              options={option}
              value={count}
              onChange={this.temp}
              name="count"
            />
          </div>
        </div>
        <div className="d-flex mt-3">
          <div className="col-6 mt-3 ">
            <p>Validity From</p>
            <NormalDateTime
              onChange={this.handleDatePick}
              value={fdate}
              name="fdate"
              showYearDropdown={true}
              dateFormat="MM/dd/yyyy"
            />
          </div>
          <div className="col-6 mt-3">
            <p>Validity To</p>
            <NormalDateTime
              onChange={this.handleDatePick}
              value={max_Date}
              name="tdate"
              showYearDropdown={true}
              dateFormat="MM/dd/yyyy"
            />
          </div>
        </div>
        <div className="mt-3 d-flex">
          <div className="col-6">
            <p>FE Sequence No</p>
            <NormalInput
              onChange={this.temp}
              type="number"
              value={fesequence}
              name="fe"
            />
          </div>
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox
                  checked={cash}
                  name="cash"
                  onChange={this.tempone}
                />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {"Allow Cash Sales"}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 d-flex">
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox
                  checked={dept}
                  name="dept"
                  onChange={this.tempone}
                />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {"The Department is currently active"}
              </p>
            </div>
          </div>
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox
                  checked={ftrial}
                  name="ftrial"
                  onChange={this.tempone}
                />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {"This is First Trial"}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 d-flex">
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox
                  checked={retail}
                  name="retail"
                  onChange={this.tempone}
                />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {"This is Retail Product"}
              </p>
            </div>
          </div>
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox
                  checked={salon}
                  name="salon"
                  onChange={this.tempone}
                />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {"This is Salon Product"}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 d-flex">
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox
                  checked={service}
                  name="service"
                  onChange={this.tempone}
                />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {"This is Service"}
              </p>
            </div>
          </div>
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox
                  checked={voucher}
                  name="voucher"
                  onChange={this.tempone}
                />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {"This is Voucher"}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 d-flex">
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox
                  checked={prepaid}
                  name="prepaid"
                  onChange={this.tempone}
                />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {"This is Prepaid"}
              </p>
            </div>
          </div>
          <div className="col-6">
            <div className="d-flex mt-3">
              <div className="mt-0 mt-3">
                <NormalCheckbox
                //name="autoProportion"
                />
              </div>
              <p className="mt-3 text-black common-label-text ">
                {"This is Compound"}
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
              onClick={() => this.Addnewequiment()}
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
      NewItemDepts,
      ItemDepts,
    },
    dispatch
  );
};

export const Departmentpopup = withTranslation()(
  connect(null, mapDispatchToProps)(DepartmentpopupClass)
);
