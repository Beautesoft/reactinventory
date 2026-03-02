import React, { Component } from "react";
import {
  NormalButtonBackend,
  NormalInput,
  NormalSelect,
} from "component/common";
import { withTranslation } from "react-i18next";
import { ItemUom, NewItemUomprices } from "redux/actions/Backend";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Toast } from "service/toast";
import { number } from "prop-types";

export class NewuompopupClass extends Component {
  state = {
    UOMC: [],
    UOM: [],
    count: null,
    uom_res: null,
    uomc_res: null,
    // editUomRes: null,
  };

  componentDidMount = () => {
    this.listuoms({});
    let { uomsde } = this.props;
    let { uom_res } = this.state;
    if (uomsde.length > 0) {
      uom_res = uomsde[uomsde.length - 1].uomDesc;
      this.setState({
        uom_res,
      });
    }
  };

  updateState = (data) => {
    if (this.state.isMounted) this.setState(data);
  };

  listuoms = async () => {
    let { UOMC, UOM } = this.state;
    UOMC = [];
    UOM = [];
    await this.props.ItemUom().then((res) => {
      for (let key of res) {
        if (key.uomIsactive) {
          UOMC.push({ value: key.uomCode, label: key.uomDesc });
          UOM.push({ value: key.uomCode, label: key.uomDesc });
        }
      }
      this.setState({
        UOMC,
        UOM,
      });
    });
  };

  /* Handle Input Values */
  handleinput = ({ target: { value, name } }) => {
    let { count, uom_res, uomc_res } = this.state;
    if (name == "UOMC") {
      uomc_res = value;
      this.setState({ uomc_res });
    }
    if (name == "UOM") {
      uom_res = value;
      this.setState({ uom_res });
    }
    if (name == "unit") {
      count = value;
      this.setState({ count });
    }
  };

  /* Submit the value */
  handlesubmit = async () => {
    let { count, uom_res, uomc_res } = this.state;
    let { uomsde } = this.props;
    if (count == null) {
      Toast({
        type: "error",
        message: "Please check required field",
      });
    } else if (uomsde.length < 1) {
      // if (uomc_res !== uom_res) {
      //   Toast({
      //     type: "error",
      //     message: "First UOM Unit Should be Simple Unit . Ex. 1 BTL = BTL",
      //   });
      // } else if (Number(count) !== 1) {
      //   Toast({
      //     type: "error",
      //     message: "First UOM Unit Should be 1",
      //   });
      // } else {
      let newlist = {
        itemCode: "",
        itemUom: uomc_res,
        uomDesc: uomc_res,
        uomUnit: count,
        itemUom2: uom_res,
        uom2Desc: uom_res,
        itemPrice: 0,
        itemCost: 0,
        minMargin: 0,
        isactive: true,
        itemUompriceSeq: 0,
        deleteUser: "",
        deleteDate: new Date(),
      };
      await this.props
        .NewItemUomprices(newlist)
        .then((data) => {})
        .catch((e) => console.log(e));
      this.props.handleModal();
      this.props.listofuom();
      // }
    } else {
      // if (Number(count) === 1) {
      //   Toast({
      //     type: "error",
      //     message: "UOM unit should be Greater than 1",
      //   });
      // } else if (uomc_res === uom_res) {
      //   Toast({
      //     type: "error",
      //     message: "UOM Code Already Exists",
      //   });
      // } else {
      let newlist = {
        itemCode: "",
        itemUom: uomc_res,
        uomDesc: uomc_res,
        uomUnit: count,
        itemUom2: uom_res,
        uom2Desc: uom_res,
        itemPrice: 0,
        itemCost: 0,
        minMargin: 0,
        isactive: true,
        itemUompriceSeq: 0,
        deleteUser: "",
        deleteDate: new Date(),
      };
      await this.props
        .NewItemUomprices(newlist)
        .then((data) => {})
        .catch((e) => console.log(e));
      this.props.handleModal();
      this.props.listofuom();
    }
    // }
  };

  render() {
    let { UOMC, count, UOM, uom_res, uomc_res, editUomRes } = this.state;
    return (
      <div>
        <div className="col-12 p-0">
          <div className="text-center">
            <h5>Add UOM</h5>
          </div>
          <div className="d-md-flex col-12 mt-3">
            <div className="col-12 col-md-5 col-lg-4">
              <h6>UOMC Description</h6>
              <NormalSelect
                options={UOMC}
                value={uomc_res}
                name="UOMC"
                onChange={this.handleinput}
              />
            </div>
            <div className="col-12 col-md-3 col-lg-4 mt-4 mt-md-0">
              <h6>
                UOM Unit <span style={{ color: "red" }}>*</span>
              </h6>
              <NormalInput
                onChange={this.handleinput}
                value={count}
                type="number"
                name="unit"
              />
            </div>
            <div className="col-12 col-md-4 col-lg-4 mt-4 mt-md-0">
              <p>UOM Description</p>
              {/* {this.props.uomsde.length < 1 ? ( */}
              <NormalSelect
                options={UOM}
                value={uom_res}
                name="UOM"
                onChange={this.handleinput}
              />
              {/* ) : ( */}
              {/* <NormalSelect
                  options={UOM}
                  value={uom_res}
                  name="UOM"
                  disabled
                  // onChange={this.handleinput}
                /> */}
              {/* )} */}
            </div>
          </div>
          <div className="d-md-flex mt-3">
            <div className="col-12 col-md-6 col-lg-6">
              <NormalButtonBackend
                mainbg={true}
                label={"Cancel"}
                onClick={() => this.props.handleModal()}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-6 mt-2 mt-md-0">
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
      ItemUom,
      NewItemUomprices,
    },
    dispatch
  );
};
export const Newuompopup = withTranslation()(
  connect(null, mapDispatchToProps)(NewuompopupClass)
);
