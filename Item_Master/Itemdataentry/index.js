import React, { Component } from "react";
import {
  InputSearch,
  NormalDate,
  NormalSelect,
  NormalCheckbox,
  NormalInput,
  NormalTimePicker,
  NormalModal,
  NormalTable,
  NormalButtonBackend,
  NormalButton,
} from "component/common";
import "./style.scss";
import { AiOutlinePlus, AiOutlineMinus } from "react-icons/ai";
import { withTranslation } from "react-i18next";
import { Departmentpopup } from "./popup/department";
import { Brandpopup } from "./popup/brand";
import { Classpopup } from "./popup/gclass";
import { Newuompopup } from "./popup/adduom";
import { Newlinkpopup } from "./popup/addlink";
import { Editlinkpopup } from "./popup/editlink";
import closeIcon from "assets/images/close.png";
import { Toast } from "service/toast";
import { RiDeleteBin5Line } from "react-icons/ri";
import { FaRegHandPointUp } from "react-icons/fa";
import { BsPencilSquare } from "react-icons/bs";
import { BiPencil } from "react-icons/bi";
import { createStaffPlus } from "redux/actions/staffPlus";
import {
  ItemDivs,
  ItemUom,
  ItemSitelists,
  NewItemUomprices,
  VoucherConditions,
  NewVoucherConditions,
  ItemBatches,
  getStocks,
  ItemBrands,
  ItemSupplies,
  NewItemStocklists,
  TaxType2TaxCodes,
  Itemusagelists,
  NewItemLinks,
  updateCommon,
  NewPrepaidOpenConditions,
  TaxType1TaxCodes,
  ItemDepts,
  NewItemRanges,
  PrepaidOpenConditions,
  ItemUomprices,
  ItemClasses,
  CommGroupHdrs,
  ItemLinks,
  ItemRanges,
  ItemTypes,
  NewPackageDtls,
  NewStocks,
  PackageDtls,
  PackageItemDetails,
  NewPackageHdrs,
  NewUsagelevels,
  VoucherValidPeriods,
  stockDetails,
  getBackendCommonApi,
  UpdateControlNo,
} from "redux/actions/Backend";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import {
  commonCreateApi,
  getCommonApi,
  commonDeleteApi,
  commonPatchApi,
} from "redux/actions/common";

export class DataEntryClass extends Component {
  state = {
    stkbalanceDetails: [{ label: "No" }, { label: "Qty" }],
    LinkcodeDetails: [
      { label: "Link Code", divClass: "justify-content-end" },
      { label: "Link Description" },
      { label: "Rpt Code" },
      { label: "Action", divClass: "justify-content-center" },
    ],
    StockDetails: [
      { label: "Store Code" },
      { label: "Store Description" },
      {
        label: "All",
        width: "20px",
        selectAll: true,
        selectAllCheck: true,
        checkboxChange: (e) => this.handleSelectAll(e),
      },
    ],
    UOMoneDetails: [
      { label: "No", divClass: "justify-content-end" },
      { label: "UOMC Code" },
      { label: "UOMC Description" },
      { label: "=" },
      { label: "UOM Unit", divClass: "justify-content-end" },
      { label: "UOM Code" },
      { label: "UOM Description" },
      { label: "Action", divClass: "justify-content-center" },
    ],
    contentHeader: [
      { label: "Line No" },
      { label: "Primary Content Detail" },
      { label: "Secondary Content Detail" },
      { label: "Active" },
      { label: "" },
    ],
    headerService: [
      {
        label: "Item Code",
        // sortKey: "Item Code",
        // enabled: true,
        // id: "itemCode",
        // singleClickFunc: () => this.handleSort("itemCode"),
        // divClass: "justify-content-end",
      },
      {
        label: "Item Description",
        // sortKey: "Item Description",
        // enabled: true,
        // id: "itemName",
        // singleClickFunc: () => this.handleSort("itemName"),
      },
      {
        label: "UOM",
        // sortKey: "UOM",
        // enabled: true,
        // id: "itemCode",
        // singleClickFunc: () => this.handleSort("itemCode"),
        // divClass: "justify-content-end",
      },
      {
        label: "Brand",
        // sortKey: "Brand",
        // enabled: true,
        // id: "itemBrand",
        // singleClickFunc: () => this.handleSort("itemBrand"),
      },
      {
        label: "Link Code",
        // sortKey: "Link Code",
        // enabled: true,
        // id: "itemCode",
        // singleClickFunc: () => this.handleSort("itemCode"),
        // divClass: "justify-content-end",
      },
      {
        label: "Range",
        // sortKey: "Range",
        // enabled: true,
        // id: "itemRange",
        // singleClickFunc: () => this.handleSort("itemRange"),
      },
      {
        label: "On Hand Qty",
        // sortKey: "On Hand Qty",
        // enabled: true,
        // id: "itemType",
        // singleClickFunc: () => this.handleSort("itemType"),
      },
      {
        label: "Item No",
        // sortKey: "Item No",
        // enabled: true,
        // id: "itemDiv",
        // singleClickFunc: () => this.handleSort("itemDiv"),
      },
      {
        sortKey: "Active",
        // enabled: true,
        // id: "itemIsactive",
        // singleClickFunc: () => this.handleSort("itemIsactive"),
      },
    ],
    packageDetails: [
      { label: "Stock Code" },
      { label: "Stock Name" },
      { label: "Division" },
      { label: "Dept" },
      { label: "Brand" },
      { label: "range" },
      { label: "UOM" },
      { label: "UOM unit" },
      { label: "Price" },
      { label: "  " },
    ],
    packagetwoDetails: [
      { label: "Item Code" },
      { label: "Description" },
      { label: "Qty" },
      { label: "U.Price" },
      { label: "Total" },
      { label: "Unit.Disc" },
      { label: "P.Price " },
      { label: "Total Amount" },
      { label: "UOM" },
      { label: "Active" },
      { label: "Action" },
      { label: "Delete" },
    ],
    UOMtwoDetails: [
      { label: "No" },
      { label: "UOMC Desc" },
      { label: "Price" },
      { label: "Cost" },
      { label: "Min Margin %" },
    ],
    ItemoneDetails: [
      {
        label: "Description",
        sortKey: "Type",
        enabled: true,
        id: "itemDesc",
        singleClickFunc: () => this.handleSort("itemDesc"),
      },
      {
        label: "Item Code",
        divClass: "justify-content-end",
        sortKey: "Type",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
      },
      {
        label: "Bar code",
        divClass: "justify-content-end",
        sortKey: "Type",
        enabled: true,
        id: "itemBarcode",
        singleClickFunc: () => this.handleSort("itemBarcode"),
      },
      {
        label: "Action",
        divClass: "justify-content-center",
        sortKey: "Type",
        enabled: true,
        id: "itemType",
        singleClickFunc: () => this.handleSort("itemType"),
      },
    ],
    ItemtwoDetails: [
      { label: "Item Code", divClass: "justify-content-end" },
      { label: "Item Description" },
      { label: "Quality", divClass: "justify-content-end" },
      { label: "UOM" },
      { label: "Active" },
      { label: "Action", divClass: "justify-content-center" },
    ],
    Serviceheader: [
      { label: "No", divClass: "justify-content-end" },
      { label: "Service Name" },
      { label: "Service Code", divClass: "justify-content-end" },
      { label: "Action", divClass: "justify-content-center" },
    ],
    prepaidDetails: [
      { label: "Type" },
      { label: "Condition Type 1" },
      { label: "Condition Type 2" },
      { label: "Amount", divClass: "justify-content-end" },
      { label: "Rate", divClass: "justify-content-end" },
      { label: "Active" },
      { label: "Action", divClass: "justify-content-center" },
    ],
    pageMeta: {},
    packagePageMeta: {},
    staffList: [],
    newFilterData: [],
    stocklist: [],
    selectAllCheckbox: true,
    option: [
      { label: 10, value: 10 },
      { label: 25, value: 25 },
      { label: 50, value: 50 },
      { label: 100, value: 100 },
    ],
    stock_type: [],
    filterPackageDetails: [],
    newStock: [],
    newPackageDtls: [],
    validperiod: [],
    Inclusive_type: [
      { label: "Product Only", value: "Product Only" },
      { label: "Service Only", value: "Service Only" },
      { label: "All", value: "All" },
    ],
    exclusive_type: [
      { label: "Product Only", value: "Product Only" },
      { label: "Service Only", value: "Service Only" },
    ],
    runing_no: null,
    itemlevelactive: null,
    Division: [],
    Uoms: [],
    sitegroup: [],
    count: 10,
    subitemusage: [],
    stock_data: [],
    getControlNo: null,
    getControlId: null,
    isoption: false,
    isgeneral: false,
    validvoucherdate: new Date(),
    idval: null,
    isstk: false,
    supply_itemsval: null,
    isstock: false,
    is_loading: false,
    is_component_loading: false,
    reoreder_level: false,
    treatmentLimitActive: false,
    serviceExpireActive: false,
    limitserviceFlexionly: false,
    expirystatus: false,
    prepaidamount: 0,
    flexiPoints: 0,
    itemClassIdId: null,
    taxone: null,
    taxtwo: null,
    itemDeptIdId: null,
    itemDivIdId: null,
    istaxcode: true,
    itemRangeIdId: null,
    itemTypeIdId: 3,
    itemusage_qty: null,
    itemusage_des: null,
    taxoneop: [],
    taxtwoop: [],
    itemusage_uom: null,
    itemusage_code: null,
    customer_replan: false,
    islink: false,
    orderBy: "desc",
    isvoucher: false,
    isservice: false,
    isopenrange: false,
    isaccode: false,
    min_qty: 0,
    serviceExpireMonth: 0,
    treatmentLimitCount: 0,
    Replenishment: 0,
    Remind_advance: 0,
    isuom: false,
    isitem: false,
    isprepaid: false,
    images: null,
    stockdivision: null,
    dept: null,
    brand: null,
    account_no: null,
    addrangeoption: [],
    stockData: [],
    linkcount: null,
    stockname: null,
    stocktype: "SINGLE",
    range_desc: null,
    range_active: false,
    range_brand: null,
    range_code: null,
    stockprice: null,
    uomprice: null,
    uomcost: null,
    uommargin: null,
    floorprice: null,
    disclimit: 0,
    ItemBarCode: 0,
    stockclass: null,
    range: null,
    description: null,
    duration: null,
    membershipPoint: null,
    priceceiling: null,
    sitecode: null,
    uomcode: null,
    validity: null,
    vouchervalue: 0,
    isOpendepartment: false,
    isOpenbrand: false,
    isOpenclass: false,
    isopenlinkedit: false,
    isopenitemedit: false,
    editid: null,
    editval: null,
    isOpenuom: false,
    isOpenlink: false,
    prepaidamountone: 0.0,
    valid: null,
    inclusivetype: [],
    brandlist: [],
    inclusive: null,
    card_noacc: false,
    exclusive: null,
    supplyitem: [],
    depts: [],
    uomsde: [],
    prepaidinclusive: null,
    prepaidexclusive: null,
    classoption: [],
    vouchervalid: false,
    prepaid_inclusive: [],
    prepaid_exclusive: [],
    iscommission: false,
    itemusage: [],
    prepaidall: false,
    prepaidprice: null,
    rangeoption: [],
    prepaidftable: [],
    linklist: [],
    percent: true,
    auto_cust_disc: true,
    tax: false,
    allow_foc: false,
    open_prepaid: false,
    commissionable: false,
    redeem_item: false,
    item_active: true,
    salescommissiongroup: [],
    workcommissiongroup: [],
    work_point: 0,
    Sales_commission: "",
    work_commission: "",
    sales_point: 0,
    item_desc: null,
    start_time: null,
    to_time: null,
    vilidityFromDate: new Date(),
    vilidityToDate: new Date(),
    from_date: new Date(),
    to_date: new Date(),
    Appt_TDT: false,
    appt: null,
    package_dept: [],
    packagedeptvalue: null,
    package_details: [],
    package_code: null,
    package_name: null,
    package_uom: null,
    package_div: null,
    package_price: null,
    package_qty: 0,
    package_discount: 0,
    content_total: null,
    disc_amount: null,
    package_total: null,
    salon: true,
    retail: false,
    package_content: [],
    evenly_method: true,
    manual_method: false,
    disc_method: null,
    item_seq: 1,
    search: "",
    filterdata: [],
    datafilter: [],
    itemusage_barcode: null,
    itemusage_dept: null,
    itemusage_div: null,
    searchone: "",
    filterdataone: [],
    rptcode: null,
    offset: 0,
    data: [],
    per_page: 10,
    //current_Page:1,
    current_page: 1,
    Itemdata: [],
    seachdata: [],
    Itempackagedata: [],
    seachpackagedata: [],
    markup_price: null,
    image: null,
    List: [],
    Servicefilter: [],
    subtable: [],
    filtersearch: [],
    isItemContent: false,
    contentDetailOne: "",
    contentDetailTwo: "",
    contentDetails: [],
    addContentDetails: {},
    contentEditId: null,
    contentLineNo: null,
    contentIsActive: false,
  };

  componentDidMount = () => {
    this.Listofmenu({});
    this.listuoms({});
    this.listofsitegropus({});
    this.Listofstocks({});
    this.listofStockListing({});
    // this.listofinclusive({});
    this.VoucherValidPeriod({});
    this.listofbrand({});
    this.listofclasses({});
    this.listofdept({});
    this.Listofitemrange({});
    this.listofsupply({});
    this.listofitemusage({});
    this.listofcommonhrds({});
    this.listtaxone({});
    this.listtaxtwo({});
    this.listofpackagedtl({});
    this.getContentDetails();

    // this.ListofServiceSearch({});
  };

  getContentDetails = () => {
    let { contentDetails, control_no } = this.state;
    this.props
      .getBackendCommonApi(
        `itemcontents/?filter=%7B%22where%22%3A%7B%22itemCode%22%3A%22${control_no}%20%22%7D%7D`
      )
      .then((res) => {
        console.log(res, "itemContentRes");
        if (res) {
          contentDetails = res;
          this.setState({ contentDetails });
        }
      });
  };
  handleSort = (sortkey, order) => {
    let { Itemdata, headerDetails, orderBy } = this.state;
    this.setState({
      orderBy: this.state.orderBy == "asc" ? "desc" : "asc",
    });

    if (orderBy === "asc") {
      Itemdata.sort((a, b) =>
        a[sortkey] > b[sortkey] ? 1 : b[sortkey] > a[sortkey] ? -1 : 0
      );
    } else {
      Itemdata.sort((a, b) =>
        a[sortkey] < b[sortkey] ? 1 : b[sortkey] < a[sortkey] ? -1 : 0
      );
    }
    this.setState({
      Itemdata,
    });
  };
  VoucherValidPeriod = () => {
    let { validperiod } = this.state;
    this.props.VoucherValidPeriods().then((res) => {
      for (let key of res) {
        validperiod.push({
          label: key.VoucherValidDesc,
          value: key.VoucherValidDesc,
        });
      }
    });
  };

  pagination = ({ target: { value, name } }) => {
    let { count, per_page, pageMeta, salon, retail } = this.state;
    if (name == "count") {
      count = +value;
      per_page = +value;
      this.setState(
        {
          count,
          per_page,
          pageMeta: { ...pageMeta, per_page: per_page },
        },
        () => this.updateitemusage(salon, retail)
      );
    }
  };

  handlePageClick = (e) => {
    const selectedPage = e.selected;
    const offset = selectedPage * this.state.per_page;
    this.setState(
      {
        current_page: selectedPage,
        offset: offset,
        pageMeta: { ...this.state.pageMeta, current_page: selectedPage },
      },
      () => {
        this.listofpackagedtl();
      }
    );
  };

  handleItemPageClick = (e) => {
    let { salon, retail } = this.state;
    const selectedPage = e.page;
    // const offset = selectedPage * this.state.per_page;

    this.setState(
      {
        current_page: selectedPage,
        pageMeta: { ...this.state.pageMeta, current_page: selectedPage },
        // offset: offset,
      },
      () => {
        this.updateitemusage(salon, retail);
      }
    );
  };

  updateState = (data) => {
    if (this.state.isMounted) this.setState(data);
  };
  Listofstocks = async () => {
    await this.props.getStocks().then((res) => {
      let { stock_data, pageMeta, count, pageCount } = this.state;

      stock_data = res;
      this.setState({
        stock_data,
        pageMeta: { ...pageMeta, total_pages: pageCount, per_page: count },
      });
    });

    let siteCode = this.props.tokenDetails.controlsite;
    await this.props
      .getBackendCommonApi(
        `ControlNos?filter=%7B%22where%22%3A%7B%22controlDescription%22%3A%22Stock%20Code%22%2C%22siteCode%22%3A%22${siteCode}%22%7D%7D`
      )
      .then((list) => {
        this.setState({
          getControlNo: list[0]?.controlNo,
          getControlId: list[0]?.controlId,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  };

  addItemFlexi = () => {
    let { subtable, addItem, control_no } = this.state;
    let addItemFlexi = [];
    subtable.map((item) => {
      addItem = {
        itemCode: control_no,
        itemSrvcode: item.itemSrvcode,
        itemSrvdesc: item.itemSrvdesc,
        itemSrvIdId: item.itemSrvIdId,
        itmIsactive: true,
      };
      addItemFlexi.push(addItem);
    });
    this.props
      .updateCommon(`ItemFlexiservices`, addItemFlexi)
      .then((res) => console.log(res));
  };

  listofpackagedtl = async () => {
    let {
      package_details,
      pageCount,
      packagePageMeta,
      Itempackagedata,
      current_page,
      per_page,
      filterPackageDetails,
    } = this.state;
    filterPackageDetails = [];
    await this.props.PackageItemDetails().then((res) => {
      const uniqueRecords = {};
      res.forEach((record) => {
        const uniqueKey = record.stockCode;
        if (!uniqueRecords[uniqueKey]) {
          uniqueRecords[uniqueKey] = true;
          filterPackageDetails.push(record);
        }
      });

      Itempackagedata = filterPackageDetails.slice(
        (current_page - 1) * per_page,
        (current_page - 1) * per_page + per_page
      );
      pageCount = Math.ceil(filterPackageDetails.length / per_page);
      this.setState({
        package_details,
        Itempackagedata,
        packagePageMeta: { ...packagePageMeta, total_pages: pageCount },
        pageCount,
        filterPackageDetails,
      });
    });
    console.log(Itempackagedata, "itempackagedata");
  };

  listofcommonhrds = async () => {
    let { salescommissiongroup, workcommissiongroup } = this.state;
    await this.props.CommGroupHdrs().then((res) => {
      for (let key of res) {
        if (key.type == "Sales") {
          salescommissiongroup.push({
            value: key.code,
            label: key.description,
            id: key.id,
          });
        } else {
          workcommissiongroup.push({
            value: key.code,
            label: key.description,
            id: key.id,
          });
        }
      }
      this.setState({
        salescommissiongroup,
        workcommissiongroup,
      });
    });
  };

  listtaxone = async () => {
    let { taxoneop } = this.state;
    taxoneop = [];
    await this.props.TaxType1TaxCodes().then((res) => {
      for (let key of res) {
        taxoneop.push({
          value: key.taxCode,
          label: key.taxDesc,
          id: key.itemCode,
        });
      }
      this.setState({
        taxoneop,
      });
    });
  };

  listtaxtwo = async () => {
    let { taxtwoop } = this.state;
    taxtwoop = [];
    await this.props.TaxType2TaxCodes().then((res) => {
      for (let key of res) {
        taxtwoop.push({
          value: key.taxCode,
          label: key.taxDesc,
          id: key.itemCode,
        });
      }
      this.setState({
        taxtwoop,
      });
    });
  };

  /*List of Division */
  Listofmenu = async () => {
    let { Division } = this.state;
    Division = [];
    await this.props.ItemDivs().then((res) => {
      for (let key of res) {
        Division.push({
          value: key.itmCode,
          label: key.itmDesc,
          id: key.itmId,
        });
      }
      this.setState({
        Division,
      });
    });
  };

  /* DEPARTMENT */
  listofdept = async () => {
    let { depts, package_dept, stockdivision } = this.state;
    let deptStock = +stockdivision;
    depts = [];
    await this.props.ItemDepts().then((res) => {
      for (let key of res) {
        package_dept.push({
          value: key.itmDesc,
          label: key.itmDesc,
          id: key.itmId,
        });
      }
      if (!deptStock) {
        for (let key of res) {
          depts.push({
            value: key.itmCode,
            label: key.itmDesc,
            id: key.itmId,
          });
        }
      }
      if (deptStock === 1) {
        for (let key of res) {
          if (key.isRetailproduct === true) {
            depts.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
            });
          }
        }
      }
      if (deptStock === 2) {
        for (let key of res) {
          if (key.isSalonproduct === true) {
            depts.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
            });
          }
        }
      }
      if (deptStock === 3) {
        for (let key of res) {
          if (key.isService === true) {
            depts.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
            });
          }
        }
      }
      if (deptStock === 4) {
        for (let key of res) {
          if (key.isVoucher === true) {
            depts.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
            });
          }
        }
      }
      if (deptStock === 5) {
        for (let key of res) {
          if (key.isPrepaid === true) {
            depts.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
            });
          }
        }
        console.log(depts);
      }

      console.log(depts);
      this.setState({
        depts,
        package_dept,
      });
      console.log(depts.length, "deptLength");
    });
  };

  /* CLASSSES */
  listofclasses = async () => {
    let { classoption } = this.state;
    classoption = [];
    await this.props.ItemClasses().then((res) => {
      for (let key of res) {
        classoption.push({
          value: key.itmCode,
          label: key.itmDesc,
          id: key.itmId,
        });
      }
      console.log(classoption);
      this.setState({
        classoption,
      });
    });
  };

  listofbrand = async () => {
    let { brandlist, stockdivision } = this.state;
    let deptBrand = +stockdivision;
    console.log(deptBrand, "deptBrand");
    brandlist = [];
    await this.props.ItemBrands().then((res) => {
      if (!deptBrand || deptBrand === 2 || deptBrand === 3) {
        console.log(res, "brandRes");
        for (let key of res) {
          brandlist.push({
            value: key.itmCode,
            label: key.itmDesc,
            id: key.itmId,
          });
        }
      }
      if (deptBrand === 1) {
        for (let key of res) {
          if (key.retailProductBrand === true) {
            brandlist.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
            });
          }
        }
      }

      if (deptBrand === 5) {
        for (let key of res) {
          if (key.prepaidBrand === true) {
            brandlist.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
            });
          }
        }
      }
      if (deptBrand === 4) {
        for (let key of res) {
          if (key.voucherBrand === true) {
            brandlist.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
            });
          }
        }
      }
      console.log(brandlist);
      this.setState({
        brandlist,
      });
      console.log(brandlist.length);
    });
  };

  listofsupply = async () => {
    let { supplyitem } = this.state;
    supplyitem = [];
    await this.props.ItemSupplies().then((res) => {
      console.log(res, "itemSupply");
      for (let key of res) {
        // if (key.splyactive == "1")
        supplyitem.push({ value: key.splyCode, label: key.supplydesc });
      }
      console.log(supplyitem, "supplyItem");
      this.setState({
        supplyitem,
      });
      console.log(supplyitem.length, "supplyItemLength");
    });
  };

  listuoms = async () => {
    let { Uoms } = this.state;
    Uoms = [];
    await this.props.ItemUom().then((res) => {
      for (let key of res) {
        if (key.uomIsactive) {
          Uoms.push({ value: key.uomCode, label: key.uomDesc });
        }
      }
      console.log(Uoms);
      this.setState({
        Uoms,
      });
      console.log(Uoms.length);
    });
  };

  Listofitemtype = async () => {
    let { stock_type, stockdivision } = this.state;
    let deptRange = +stockdivision;
    stock_type = [];
    await this.props.ItemTypes().then((res) => {
      console.log(res, "rangeRes");
      if (
        this.state.stockdivision == "1" ||
        this.state.stockdivision == "4" ||
        this.state.stockdivision == "5"
      ) {
        for (let key of res) {
          if (key.itmName == "SINGLE") {
            stock_type.push({
              value: key.itmName,
              label: key.itmName,
              id: key.itmId,
            });
          }
        }
      }
      if (this.state.stockdivision == "2") {
        for (let key of res) {
          if (key.itmName !== "COURSE") {
            stock_type.push({
              value: key.itmName,
              label: key.itmName,
              id: key.itmId,
            });
          }
        }
      }
      if (this.state.stockdivision == "3") {
        for (let key of res) {
          stock_type.push({
            value: key.itmName,
            label: key.itmName,
            id: key.itmId,
          });
        }
      }

      console.log(stock_type);
      this.setState({
        stock_type,
      });
      console.log(stock_type.length);
    });
  };

  /*RANGE */
  Listofitemrange = async (brandValue) => {
    console.log(brandValue, "brandValue");
    let { rangeoption, addrangeoption, stockdivision } = this.state;
    rangeoption = [];
    await this.props.ItemRanges().then((res) => {
      addrangeoption = res;
      let range = +stockdivision;
      console.log(addrangeoption, "addRange");
      if (!range || range === 2) {
        for (let key of res) {
          if (this.state.brand == key.itmBrand) {
            rangeoption.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
            });
          }
        }
      }
      let rangeValue = [];
      console.log(rangeoption, "rangee");
      if (brandValue.length < 3) {
        rangeValue = addrangeoption.filter(
          (item) => item.itmDept === brandValue
        );
        for (let key of rangeValue) {
          rangeoption.push({
            value: key.itmCode,
            label: key.itmDesc,
            id: key.itmId,
            dept: key.itmDept,
          });
        }
      } else if (brandValue.length > 3) {
        rangeValue = addrangeoption.filter(
          (list) => list.itmBrand === brandValue
        );
        for (let key of rangeValue) {
          rangeoption.push({
            value: key.itmCode,
            label: key.itmDesc,
            id: key.itmId,
            brand: key.itmBrand,
          });
        }
      } else if (range === 1) {
        for (let key of res) {
          if (key.isproduct) {
            rangeoption.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
              brand: key.itmBrand,
            });
          }
        }
      } else if (range === 3) {
        for (let key of res) {
          if (key.isservice) {
            rangeoption.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
              brand: key.itmBrand,
            });
          }
        }
      } else if (range === 4) {
        for (let key of res) {
          if (key.isvoucher) {
            rangeoption.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
              brand: key.itmBrand,
            });
          }
        }
      } else if (range === 5) {
        for (let key of res) {
          if (key.isprepaid) {
            rangeoption.push({
              value: key.itmCode,
              label: key.itmDesc,
              id: key.itmId,
              brand: key.itmBrand,
            });
          }
        }
      }

      console.log(rangeoption, "rangeOption");
      this.setState({
        rangeoption,
        addrangeoption,
      });
      console.log(rangeoption.length);
    });
  };

  listofsitegropus = async () => {
    let { sitegroup } = this.state;
    sitegroup = [];
    await this.props.ItemSitelists().then((res) => {
      for (let key of res) {
        if (key.itemsiteIsactive == true) {
          sitegroup.push({ value: key.itemsiteCode, label: key.itemsiteDesc });
        }
      }
      this.setState({
        sitegroup,
      });
    });
  };

  listofStockListing = async () => {
    let { stocklist } = this.state;
    stocklist = [];
    await this.props.ItemSitelists().then((res) => {
      for (let key of res) {
        if (key.itemsiteIsactive == true) {
          stocklist.push({
            itemsiteCode: key.itemsiteCode,
            itemsiteDesc: key.itemsiteDesc,
            itemsiteIsactive: key.itemsiteIsactive,
          });
        }
      }
      this.setState({
        stocklist,
      });
    });
  };
  listofitemusage = async () => {
    let {
      Itemdata,
      itemusage,
      stockData,
      current_page,
      per_page,
      pageCount,
      pageMeta,
    } = this.state;
    let { tokenDetails } = this.props;
    console.log(tokenDetails, "TokenDetails");
    itemusage = [];
    stockData = [];
    await this.props.Itemusagelists().then((res) => {
      console.log(res, "subItemRes");
      for (let key of res) {
        if (key.sitecode == tokenDetails.controlsite) {
          if (key.division == "2") {
            itemusage.push({
              ItemCode: key.itemcode,
              Description: key.itemdesc,
              barcode: key.itemBarcode,
              department: key.itemdept,
              division: key.division,
            });
          }
          stockData.push({
            ItemCode: key.itemcode,
            Description: key.itemdesc,
            barcode: key.itemBarcode,
            department: key.itemdept,
            division: key.division,
          });
        }
      }

      console.log(stockData, "stockDataLoad");

      itemusage.sort((a, b) => a.Description.localeCompare(b.Description));
      console.log(itemusage, "ItemUsage");
      Itemdata = itemusage.slice(
        (current_page - 1) * per_page,
        (current_page - 1) * per_page + per_page
      );
      pageCount = Math.ceil(itemusage.length / per_page);
      console.log(pageCount, "pageCount");
      this.setState({
        Itemdata,
        stockData,
        pageMeta: { ...pageMeta, total_pages: pageCount },
      });
      console.log(Itemdata, "SubItemUsageList");
    });
  };
  // listofitemusage = async () => {
  //   let {
  //     itemusage,
  //     Itemdata,
  //     pageCount,
  //     current_page,
  //     per_page,
  //     pageMeta,
  //     count,
  //     stockData,
  //   } = this.state;
  //   itemusage = [];
  //   stockData = [];
  //   await this.props.getStocks().then((res) => {
  //     for (let key of res) {
  //       if (key.itemDiv == "2") {
  //         itemusage.push({
  //           itemDiv: key.itemDiv,
  //           itemDesc: key.itemDesc,
  //           itemCode: key.itemCode,
  //           itemBarcode: key.itemBarcode,
  //           itemdept: key.itemDept,
  //           itemUom: key.itemUom,
  //           itemIsactive: key.itemIsactive,
  //         });
  //       }
  //       stockData.push({
  //         ItemCode: key.itemcode,
  //         Description: key.itemdesc,
  //         barcode: key.itemBarcode,
  //         department: key.itemdept,
  //         division: key.division,
  //       });
  //     }
  //     itemusage.sort((a, b) => a.itemDesc.localeCompare(b.itemDesc));
  //     Itemdata = itemusage.slice(
  //       (current_page - 1) * per_page,
  //       (current_page - 1) * per_page + per_page
  //     );
  //     pageCount = Math.ceil(itemusage.length / this.state.per_page);
  //     console.log(itemusage);
  //     this.setState({
  //       itemusage,
  //       Itemdata,
  //       stockData,
  //       pageCount,
  //       pageMeta: { ...pageMeta, total_pages: pageCount, per_page: count },
  //     });
  //     console.log(itemusage.length);
  //   });
  // };

  handlePackagePage = (e) => {
    let { pageMeta, packagePageMeta } = this.state;
    const selectedPage = e.page;
    console.log(selectedPage, "selectedPage");
    // const offset = selectedPage * this.state.per_page;
    this.setState(
      {
        current_page: selectedPage,
        packagePageMeta: {
          ...this.state.packagePageMeta,
          current_page: selectedPage,
        },
        // offset: offset,
      },
      () => {
        this.listofpackagedtl();
      }
    );
    console.log(packagePageMeta, "pageMeta");
  };
  //Item UOM//
  listofuomprices = async () => {
    let { uomsde } = this.state;
    await this.props.ItemUomprices().then((res) => {
      let temp = {
        id: res[res.length - 1].id,
        itemCode: res[res.length - 1].itemCode,
        itemUom: res[res.length - 1].itemUom,
        uomDesc: res[res.length - 1].uomDesc,
        uomUnit: res[res.length - 1].uomUnit,
        itemUom2: res[res.length - 1].itemUom2,
        uom2Desc: res[res.length - 1].uom2Desc,
        itemPrice: res[res.length - 1].itemPrice,
        itemCost: res[res.length - 1].itemCost,
        minMargin: res[res.length - 1].minMargin,
        isactive: res[res.length - 1].isactive,
        itemUompriceSeq: res[res.length - 1].itemUompriceSeq,
        deleteUser: res[res.length - 1].deleteUser,
        deleteDate: res[res.length - 1].deleteDate,
      };
      uomsde.push(temp);
      this.setState({
        uomsde,
      });
      console.log(uomsde.length, "uomSIde");
    });
  };

  //Item Link //
  listoflinklist = async () => {
    let { linklist } = this.state;
    await this.props.ItemLinks().then((res) => {
      let temp = {
        linkCode: res[res.length - 1].linkCode,
        itemCode: res[res.length - 1].itemCode,
        linkDesc: res[res.length - 1].linkDesc,
        linkFactor: res[res.length - 1].linkFactor,
        linkType: res[res.length - 1].linkType,
        itmIsactive: res[res.length - 1].itmIsactive,
        rptCodeStatus: res[res.length - 1].rptCodeStatus,
        itmId: res[res.length - 1].itmId,
      };
      linklist.push(temp);
      this.setState({
        linklist,
      });
    });
  };

  listofEditlinklist = async () => {
    let { linklist, linkcount } = this.state;
    linklist.length = 0;
    this.setState({
      linklist,
    });
    console.log(linkcount, linklist);
    for (var i = linkcount; i > 0; i--) {
      await this.props.ItemLinks().then((res) => {
        let temp = {
          linkCode: res[res.length - i].linkCode,
          itemCode: res[res.length - i].itemCode,
          linkDesc: res[res.length - i].linkDesc,
          linkFactor: res[res.length - i].linkFactor,
          linkType: res[res.length - i].linkType,
          itmIsactive: res[res.length - i].itmIsactive,
          rptCodeStatus: res[res.length - i].rptCodeStatus,
          itmId: res[res.length - i].itmId,
        };
        linklist.push(temp);
        this.setState({
          linklist,
        });
        console.log(linklist);
      });
    }
  };

  Additemusage = (code, desc, dept, div, barcode, uom, active) => {
    console.log(code, desc, dept, div, barcode, uom, active);
    let {
      itemusage_code,
      itemusage_des,
      itemusage_barcode,
      itemusage_dept,
      itemusage_div,
      itemlevelactive,
      itemusage_uom,
    } = this.state;
    itemusage_code = code;
    itemusage_des = desc;
    itemusage_barcode = barcode;
    itemusage_dept = dept;
    itemusage_div = div;
    itemusage_uom = uom;
    itemlevelactive = active;
    this.setState({
      itemusage_code,
      itemusage_des,
      itemusage_barcode,
      itemusage_dept,
      itemusage_div,
      itemusage_uom,
      itemlevelactive,
    });
    console.log(itemlevelactive);
    this.handleEdititemDialog();
  };

  Additemusagetable = (code, desc, bar, dept, div, uom, qty, active) => {
    console.log(active);
    let { subitemusage } = this.state;
    let temp = {
      ItemCode: code,
      Description: desc,
      Quantity: qty,
      Active: active,
      UOM: uom,
      barcode: bar,
      department: dept,
      division: div,
    };
    subitemusage.push(temp);
    this.setState({ subitemusage });
    console.log(subitemusage);
    this.handleEdititemDialog();
  };

  changelink = (id, val, count) => {
    let { editid, editval, linkcount } = this.state;
    editid = id;
    editval = val;
    linkcount = count;
    this.setState({ editval, editid, linkcount });
    this.handleEditlinkDialog();
  };
  //Prepaidd section //
  listofinclusive = async () => {
    let { inclusivetype } = this.state;
    inclusivetype = [];
    await this.props.VoucherConditions().then((res) => {
      for (let key of res) {
        if (key.conditiontype1 == "Service Only") {
          inclusivetype.push({ value: key.itemCode, label: key.description });
        }
      }
      inclusivetype = res;
      console.log(inclusivetype);
      this.setState({
        inclusivetype,
      });
      console.log(inclusivetype.length);
    });
  };

  Inclusivelist = async (ptype) => {
    if (ptype == "Product Only") {
      let { prepaid_inclusive } = this.state;
      prepaid_inclusive = [];
      await this.props.ItemBrands().then((res) => {
        console.log(res, "ResponseItem");
        for (let key of res) {
          prepaid_inclusive.push({ value: key.itmDesc, label: key.itmDesc });
        }
        this.setState({
          prepaid_inclusive,
        });
      });
    } else if (ptype == "Service Only") {
      let { prepaid_inclusive } = this.state;
      prepaid_inclusive = [];
      await this.props.ItemDepts().then((res) => {
        for (let key of res) {
          prepaid_inclusive.push({ value: key.itmDesc, label: key.itmDesc });
        }
        this.setState({
          prepaid_inclusive,
        });
      });
    } else {
      let { prepaid_inclusive } = this.state;
      prepaid_inclusive = [];
      prepaid_inclusive.push({ value: "ALL", label: "ALL" });
      this.setState({
        prepaid_inclusive,
      });
    }
  };

  Exclusivelist = async (ptype) => {
    if (ptype == "Product Only") {
      let { prepaid_exclusive } = this.state;
      prepaid_exclusive = [];
      await this.props.ItemBrands().then((res) => {
        for (let key of res) {
          prepaid_exclusive.push({ value: key.itmDesc, label: key.itmDesc });
        }
        this.setState({
          prepaid_exclusive,
        });
      });
    } else {
      let { prepaid_exclusive } = this.state;
      prepaid_exclusive = [];
      await this.props.ItemDepts().then((res) => {
        for (let key of res) {
          prepaid_exclusive.push({ value: key.itmCode, label: key.itmDesc });
        }
        this.setState({
          prepaid_exclusive,
        });
      });
    }
  };

  prapaidtable = (type, cond1, all, cond2, price) => {
    console.log("check");
    let { prepaidftable, prepaidamount, prepaidamountone } = this.state;
    let tempreapidamount = 0;
    if (price == null) {
      Toast({
        type: "error",
        message: "Price value is empty",
      });
    } else {
      let temp = {
        type: type,
        condition1: cond1,
        condition2: all ? "All" : cond2,
        price: price,
      };
      console.log(temp, "tempCheck");
      prepaidftable.push(temp);
      this.setState({ prepaidftable });
    }
    prepaidftable = prepaidftable.map(
      (x) => (tempreapidamount = Number(tempreapidamount) + Number(x.price))
    );
    prepaidamount = tempreapidamount.toFixed(2);
    prepaidamountone = tempreapidamount.toFixed(2);
    this.setState({ prepaidamount, prepaidamountone });
    console.log(prepaidftable);
  };

  prapaidtableone = (type, cond1, cond2) => {
    console.log("check");
    let { prepaidftable } = this.state;
    let temp = {
      type: type,
      condition1: cond1,
      condition2: cond2,
      price: "",
    };
    prepaidftable.push(temp);
    this.setState({ prepaidftable });
    console.log(prepaidftable);
  };

  Deleteprepaid = (id) => {
    console.log("delete");
    let { prepaidftable, prepaidamount, prepaidamountone } = this.state;
    let tempreapidamount = 0;
    prepaidftable = prepaidftable.filter(function (x, index) {
      return index !== id;
    });
    this.setState({ prepaidftable });
    prepaidftable = prepaidftable.map(
      (x) => (tempreapidamount = Number(tempreapidamount) + Number(x.price))
    );
    prepaidamount = tempreapidamount.toFixed(2);
    prepaidamountone = tempreapidamount.toFixed(2);
    this.setState({ prepaidamount, prepaidamountone });
  };

  aboutpopup() {
    this.setState({
      isoption: !this.state.isoption,
    });
  }
  generalcontent() {
    this.setState({
      isgeneral: !this.state.isgeneral,
    });
  }
  stkbalancecontent() {
    this.setState({
      isstk: !this.state.isstk,
    });
  }
  Linkcontent() {
    this.setState({
      islink: !this.state.islink,
    });
  }
  stockcontent() {
    this.setState({
      isstock: !this.state.isstock,
    });
  }
  vouchercontent() {
    this.setState({
      isvoucher: !this.state.isvoucher,
    });
  }
  servicecontent() {
    this.setState({
      isservice: !this.state.isservice,
    });
  }
  itemContent() {
    this.setState({
      isItemContent: !this.state.isItemContent,
    });
  }
  Accountcodecontent() {
    this.setState({
      isaccode: !this.state.isaccode,
    });
  }
  UOMcontent() {
    this.setState({
      isuom: !this.state.isuom,
    });
  }
  commissioncontent() {
    this.setState({ iscommission: !this.state.iscommission });
  }
  Itemusagecontent() {
    this.setState({
      isitem: !this.state.isitem,
    });
  }

  taxcodecontent() {
    this.setState({
      istaxcode: !this.state.istaxcode,
    });
  }
  Prepaidcontent() {
    this.setState({
      isprepaid: !this.state.isprepaid,
    });
  }

  handlecheckbox = ({ target: { value, name } }) => {
    let {
      percent,
      allow_foc,
      auto_cust_disc,
      tax,
      open_prepaid,
      item_active,
      redeem_item,
      commissionable,
    } = this.state;
    if (name == "percent") {
      percent = value;
      this.setState({ percent });
    }
    if (name == "allow_foc") {
      allow_foc = value;
      this.setState({ allow_foc });
    }
    if (name == "auto_cust_disc") {
      auto_cust_disc = value;
      this.setState({ auto_cust_disc });
    }
    if (name == "tax") {
      tax = value;
      this.setState({ tax });
    }
    if (name == "open_prepaid") {
      open_prepaid = value;
      this.setState({ open_prepaid });
    }
    if (name == "item_active") {
      item_active = value;
      this.setState({ item_active });
    }
    if (name == "redeem_item") {
      redeem_item = value;
      this.setState({ redeem_item });
    }
    if (name == "commissionable") {
      commissionable = value;
      this.setState({ commissionable });
    }
  };
  typeid = (type) => {
    let { itemDivIdId, Division } = this.state;
    for (var i = 0; i < Division.length; i++) {
      if (type == Division[i].value) {
        itemDivIdId = Division[i].id;
      }
    }
    this.setState({ itemDivIdId });
    console.log(itemDivIdId, "itemDivid");
  };
  deptype = (type) => {
    let { itemDeptIdId, depts } = this.state;
    for (var i = 0; i < depts.length; i++) {
      if (type == depts[i].value) {
        itemDeptIdId = depts[i].id;
      }
    }
    this.setState({ itemDeptIdId });
    console.log(itemDeptIdId);
  };
  Divtype = (type) => {
    let { itemTypeIdId, stocktype } = this.state;

    if (stocktype == "SINGLE") {
      itemTypeIdId = 3;
    } else if (stocktype == "PACKAGE") {
      itemTypeIdId = 6;
    } else {
      itemTypeIdId = 7;
    }
    this.setState({ itemTypeIdId });
    console.log(itemTypeIdId);
  };
  classtype = (type) => {
    let { itemClassIdId, classoption } = this.state;
    for (var i = 0; i < classoption.length; i++) {
      if (type == classoption[i].value) {
        itemClassIdId = classoption[i].id;
      }
    }
    this.setState({ itemClassIdId });
    console.log(itemClassIdId);
  };
  rangetype = (type) => {
    let { itemRangeIdId, rangeoption } = this.state;
    for (var i = 0; i < rangeoption.length; i++) {
      if (type == rangeoption[i].value) {
        itemRangeIdId = rangeoption[i].id;
      }
    }
    this.setState({ itemRangeIdId });
    console.log(itemRangeIdId);
  };

  temp = ({ target: { value, name } }) => {
    console.log(value, name);
    let {
      stockdivision,
      dept,
      brand,
      taxone,
      stockname,
      stocktype,
      stockprice,
      floorprice,
      disclimit,
      ItemBarCode,
      item_seq,
      stockclass,
      item_desc,
      supply_itemsval,
      range,
      inclusive,
      exclusive,
      description,
      duration,
      membershipPoint,
      count,
      valid,
      vouchervalid,
      validvoucherdate,
      priceceiling,
      control_no,
      markup_price,
      account_no,
      taxtwo,
    } = this.state;
    if (name == "stockdivision") {
      stockdivision = value;
      control_no = stockdivision;
      console.log(control_no, "controlNo");
      this.setState({ stockdivision }, () => {
        this.setState({ control_no });
        this.listofdept({});
        this.listofbrand({});
        this.listofclasses({});
        this.Listofitemtype({});
        this.Listofitemrange({});
        this.typeid(stockdivision);
      });
    }
    if (name == "supply_itemsval") {
      supply_itemsval = value;
      this.setState({ supply_itemsval });
    }
    if (name == "account_no") {
      account_no = value;
      this.setState({ account_no });
    }
    if (name == "taxone") {
      taxone = value;
      this.setState({ taxone });
    }
    if (name == "taxtwo") {
      taxtwo = value;
      this.setState({ taxtwo });
    }
    if (name == "item_desc") {
      if (value.length <= 60) {
        item_desc = value;
        this.setState({ item_desc });
      } else {
        Toast({
          type: "error",
          message: "Description must be less than or equal to 60 char",
        });
      }
    }
    if (name == "vouchervalid") {
      vouchervalid = value;
      this.setState({ vouchervalid });
    }
    if (name == "validvoucherdate") {
      validvoucherdate = value;
      this.setState({ validvoucherdate });
    }
    if (name == "inclusive") {
      inclusive = value;
      this.setState({ inclusive });
      console.log(inclusive);
      this.Inclusivelist(inclusive);
    }
    if (name == "exclusive") {
      exclusive = value;
      this.setState({ exclusive });
      this.Exclusivelist(exclusive);
    }
    if (name == "dept") {
      dept = value;
      control_no = stockdivision + dept;
      this.setState({ dept });
      this.setState({ control_no });
      if (stockdivision == "3") {
        this.Listofitemrange(dept);
      }

      this.deptype(dept);
    }
    if (name == "brand") {
      brand = value;
      this.setState({ brand });
      let rangeFilter = Number(this.state.stockdivision) === 3;
      if (!rangeFilter) {
        this.Listofitemrange(brand);
      }
    }
    if (name == "stockname") {
      if (value.length <= 40) {
        stockname = value;
        item_desc = value;
        this.setState({ stockname, item_desc });
      } else {
        Toast({
          type: "error",
          message: "Name Must be less than or equal to 40 char",
        });
      }
    }
    if (name == "stocktype") {
      stocktype = value;
      this.setState({ stocktype });
      console.log(stocktype);
      this.Divtype(stocktype);
    }
    if (name == "stockprice") {
      stockprice = value;
      this.setState({ stockprice });
    }
    if (name == "disclimit") {
      disclimit = value;
      this.setState({ disclimit });
    }
    if (name == "ItemBarCode") {
      ItemBarCode = value;
      this.setState({ ItemBarCode });
    }
    if (name == "floorprice") {
      if (value > stockprice) {
        Toast({
          type: "error",
          message: "FloorPrice always less than or equal to price",
        });
      } else {
        floorprice = value;
        this.setState({ floorprice });
      }
    }
    if (name == "stockclass") {
      stockclass = value;
      this.setState({ stockclass });
      this.classtype(stockclass);
    }
    if (name == "range") {
      range = value;
      this.setState({ range });
      this.rangetype(range);
    }
    if (name == "description") {
      description = value;
      this.setState({ description });
    }
    if (name == "item_seq") {
      item_seq = value;
      this.setState({ item_seq });
    }
    if (name == "cost") {
      if (value > stockprice) {
        Toast({
          type: "error",
          message: "Cost always less than or equal to price",
        });
      } else {
        priceceiling = value;
        this.setState({ priceceiling });
      }
    }
    if (name == "duration") {
      duration = value;
      this.setState({ duration });
    }
    if (name == "membershipPoint") {
      membershipPoint = value;
      this.setState({ membershipPoint });
    }
    if (name == "count") {
      count = value;
      this.setState({ count });
    }
    if (name == "validdays") {
      valid = value;
      this.setState({ valid });
    }
    if (name == "markup_price") {
      markup_price = value;
      this.setState({ markup_price });
    }
  };

  handlechangestk = ({ target: { value, name } }) => {
    let {
      sitecode,
      uomcode,
      vouchervalue,
      validity,
      valid,
      prepaidall,
      prepaidinclusive,
      prepaidamount,
      flexiPoints,
      prepaidexclusive,
      prepaidprice,
      card_noacc,
      customer_replan,
      reoreder_level,
      serviceExpireActive,
      expirystatus,
      treatmentLimitCount,
      serviceExpireMonth,
      treatmentLimitActive,
      limitserviceFlexionly,
      contentDetailOne,
      contentDetailTwo,
    } = this.state;
    console.log(name, value);
    if (name == "treatmentLimitCount") {
      treatmentLimitCount = value;
      this.setState({ treatmentLimitCount });
    }
    if (name == "treatmentLimitActive") {
      treatmentLimitActive = value;
      this.setState({ treatmentLimitActive });
    }
    if (name == "limitserviceFlexionly") {
      limitserviceFlexionly = value;
      this.setState({ limitserviceFlexionly });
    }

    if (name == "flexiPoints") {
      flexiPoints = value;
      this.setState({ flexiPoints });
    }
    if (name == "valid") {
      valid = value;
      this.setState({ valid });
    }
    if (name == "serviceExpireMonth") {
      serviceExpireMonth = value;
      this.setState({ serviceExpireMonth });
    }
    if (name == "prepaidamount") {
      prepaidamount = value;
      this.setState({ prepaidamount });
    }
    if (name == "card_noacc") {
      card_noacc = value;
      this.setState({ card_noacc });
    }
    if (name == "customer_replan") {
      customer_replan = value;
      this.setState({ customer_replan });
    }
    if (name == "reoreder_level") {
      reoreder_level = value;
      this.setState({ reoreder_level });
    }
    if (name == "serviceExpireActive") {
      serviceExpireActive = value;
      this.setState({ serviceExpireActive });
    }
    if (name == "expirystatus") {
      expirystatus = value;
      this.setState({ expirystatus });
    }
    if (name == "sitecode") {
      sitecode = value;
      this.setState({ sitecode });
    }
    if (name == "uomcode") {
      uomcode = value;
      this.setState({ uomcode });
    }
    if (name == "vouchervalue") {
      vouchervalue = value;
      this.setState({ vouchervalue });
    }
    if (name == "validity") {
      validity = value;
      this.setState({ validity });
    }
    if (name == "prepaidall") {
      prepaidall = value;
      this.setState({ prepaidall });
    }
    if (name == "prepaidinclusive") {
      prepaidinclusive = value;
      this.setState({ prepaidinclusive });
      console.log(prepaidinclusive, "prepaidInclusive");
    }
    if (name == "prepaidexclusive") {
      prepaidexclusive = value;
      this.setState({ prepaidexclusive });
    }
    if (name == "prepaidprice") {
      prepaidprice = value;
      this.setState({ prepaidprice });
    }
    if (name == "contentDetailOne") {
      contentDetailOne = value;
      this.setState({ contentDetailOne });
    }
    if (name == "contentDetailTwo") {
      contentDetailTwo = value;
      this.setState({ contentDetailTwo });
    }
  };

  handlestk = ({ target: { value, name } }) => {
    let { min_qty, Replenishment, Remind_advance } = this.state;
    if (name == "min_qty") {
      min_qty = value;
      this.setState({ min_qty });
    }
    if (name == "Replenishment") {
      Replenishment = value;
      this.setState({ Replenishment });
    }
    if (name == "Remind_advance") {
      Remind_advance = value;
      this.setState({ Remind_advance });
    }
  };

  sublist = ({ target: { value, name } }) => {
    let { work_commission, sales_point, work_point, Sales_commission } =
      this.state;
    if (name == "work_commission") {
      work_commission = value;
      this.setState({ work_commission });
    }
    if (name == "Sales_commission") {
      Sales_commission = value;
      this.setState({ Sales_commission });
    }
    if (name == "work_point") {
      work_point = value;
      this.setState({ work_point });
    }
    if (name == "sales_point") {
      sales_point = value;
      this.setState({ sales_point });
    }
  };

  Item_Code = ({ target: { value, name } }) => {
    let { itemusage_code, itemusage_des, itemusage_qty, itemusage_uom } =
      this.state;
    if (name == "itemusage_code") {
      itemusage_code = value;
      this.setState({ itemusage_code });
    }
    if (name == "itemusage_des") {
      itemusage_des = value;
      this.setState({ itemusage_des });
    }
    if (name == "itemusage_qty") {
      itemusage_qty = value;
      this.setState({ itemusage_qty });
    }
    if (name == "itemusage_uom") {
      itemusage_uom = value;
      this.setState({ itemusage_uom });
    }
  };

  handlerange = ({ target: { value, name } }) => {
    let { range_active, range_brand, range_code, range_desc } = this.state;
    if (name == "range_active") {
      range_active = value;
      this.setState({ range_active });
    }
    if (name == "range_brand") {
      range_brand = value;
      this.setState({ range_brand });
    }
    if (name == "range_code") {
      range_code = value;
      this.setState({ range_code });
    }
    if (name == "range_desc") {
      range_desc = value;
      this.setState({ range_desc });
    }
  };
  handleSelectAll = () => {
    let { stocklist, StockDetails, selectAllCheckbox } = this.state;

    stocklist.forEach((item) => {
      item.itemsiteIsactive = !selectAllCheckbox;
    });
    const updatedStockDetails = [...this.state.StockDetails]; // Copy the array
    updatedStockDetails[2].selectAllCheck = !selectAllCheckbox;

    this.setState((prevState) => ({
      stocklist,
      StockDetails: updatedStockDetails,
      selectAllCheckbox: !prevState.selectAllCheckbox,
    }));
  };

  AddContentDetails = () => {
    let {
      contentDetailOne,
      contentDetailTwo,
      addContentDetails,
      contentDetails,
      control_no,
      tem_no,
      stock_data,
      getControlNo,
      contentEditId,
      contentLineNo,
      contentIsActive,
    } = this.state;

    if (contentDetailOne === "" || contentDetailTwo === "") {
      Toast({
        type: "error",
        message: "Please enter the content Details",
      });
      return;
    }
    if (contentEditId) {
      let data = {
        itemCode: control_no,
        contentLineNo: contentLineNo,
        contentDetail1: contentDetailOne,
        contentDetail2: contentDetailTwo,
        isActive: contentIsActive,
      };
      this.props
        .updateCommon(`ItemContents/${contentEditId}/replace`, data)
        .then((res) => {
          this.setState({
            contentDetailOne: "",
            contentDetailTwo: "",
            contentEditId: null,
          });
          this.getContentDetails();
        });
    } else {
      if (getControlNo) {
        let tem_no = getControlNo;
        tem_no = tem_no.slice(tem_no.length - 5);
        console.log(tem_no, "tem");
        let incrementedTemNo = (parseInt(tem_no, 10) + 1)
          .toString()
          .padStart(tem_no.length, "0");
        console.log(incrementedTemNo, "increment");
        control_no = control_no.toString() + incrementedTemNo;
        console.log(control_no, "con");
        this.setState({ control_no });
      } else {
        tem_no = 1;
        control_no = control_no + tem_no;
        this.setState({ control_no });
      }

      if (control_no) {
        let data = {
          itemcode: control_no,
          content_line_no: contentDetails.length + 1,
          content_detail_1: contentDetailOne,
          Content_detail_2: contentDetailTwo,
        };
        this.props.commonCreateApi(`itemcontent/`, data).then((res) => {
          console.log(res, "contentRes");
          this.setState({
            contentDetailOne: "",
            contentDetailTwo: "",
          });
          this.getContentDetails();
        });
      }
    }
  };
  handleItemContentUpdate = async (item) => {
    let { contentDetails, rptcode, control_no } = this.state;

    for (let i = 0; i <= contentDetails.length - 1; i++) {
      if (contentDetails[i].id == item.id) {
        contentDetails[i].isActive = !contentDetails[i].isActive;
        let data = {
          itemCode: control_no,
          contentLineNo: contentDetails[i].contentLineNo,
          contentDetail1: contentDetails[i].contentDetail1,
          contentDetail2: contentDetails[i].contentDetail2,
          isActive: contentDetails[i].isActive,
        };

        this.props
          .updateCommon(`itemcontents/${item.id}/replace`, data)
          .then((res) => {
            console.log(res, "contentUpdateRes");
            this.getContentDetails();
          });
      }
    }
    this.setState({ contentDetails });
  };
  handleDeleteItemContent = (id) => {
    this.props.commonDeleteApi(`itemcontent/${id}/`).then((res) => {
      this.getContentDetails();
    });
  };
  handleCheckboxone = async (item) => {
    let { stocklist } = this.state;
    for (let i = 0; i <= stocklist.length - 1; i++) {
      if (stocklist[i].itemsiteCode == item) {
        stocklist[i].itemsiteIsactive = !stocklist[i].itemsiteIsactive;
      }
    }
    this.setState({ stocklist });
  };

  handleCheckboxtwo = async (item) => {
    let { linklist, rptcode } = this.state;
    for (let i = 0; i <= linklist.length - 1; i++) {
      if (linklist[i].linkCode == item) {
        linklist[i].rptCodeStatus = !linklist[i].rptCodeStatus;
        rptcode = linklist[i].linkCode;
      } else {
        linklist[i].rptCodeStatus = false;
      }
    }
    this.setState({ linklist, rptcode });
  };

  // upload imag to formfield
  // handleimageChange(event) {
  //   debugger;
  //   let { images } = this.state;
  //   images = URL.createObjectURL(event.target.files[0]);
  //   this.setState({
  //     images,
  //   });
  //   console.log(images);
  // }
  handleimageChange = (event) => {
    const displayImage = URL.createObjectURL(event.target.files[0]);

    this.setState({
      images: event.target.files[0],
      image: displayImage,
    });
  };

  handleDialog = () => {
    let { isOpendepartment } = this.state;
    this.setState({ isOpendepartment: !isOpendepartment });
  };
  handlebrandDialog = () => {
    let { isOpenbrand } = this.state;
    this.setState({ isOpenbrand: !isOpenbrand });
  };
  handleclassDialog = () => {
    let { isOpenclass } = this.state;
    this.setState({ isOpenclass: !isOpenclass });
  };
  handleuomDialog = () => {
    let { isOpenuom } = this.state;
    this.setState({ isOpenuom: !isOpenuom });
  };
  handlelinkDialog = () => {
    let { isOpenlink, linklist } = this.state;
    this.setState({ isOpenlink: !isOpenlink });
  };
  handleEditlinkDialog = () => {
    let { isopenlinkedit } = this.state;
    this.setState({ isopenlinkedit: !isopenlinkedit });
  };
  handleEdititemDialog = () => {
    let { isopenitemedit } = this.state;
    this.setState({ isopenitemedit: !isopenitemedit });
  };
  handlerangeDialog = () => {
    let { isopenrange, range_code, addrangeoption, tem_no } = this.state;
    if (addrangeoption.length > 0) {
      tem_no = addrangeoption[addrangeoption.length - 1].itmCode;
      console.log(tem_no);
      tem_no = Number(tem_no) + 1;
      range_code = range_code + tem_no;
      console.log(range_code);
    } else {
      range_code = 1;
      console.log(range_code);
    }
    this.setState({ isopenrange: !isopenrange, range_code });
  };

  Addrangeitems = async (code, desc, brand_id, active) => {
    let { brand, range_active, range_desc, range_code, range_brand } =
      this.state;
    if (code == null || desc == null) {
      Toast({
        type: "error",
        message: "Please check required field",
      });
    } else {
      let newreason = {
        itmCode: code,
        itmDesc: desc,
        itmStatus: active,
        itmDept: brand,
        itmBrand: brand_id,
        isproduct: true,
        prepaidForProduct: false,
        prepaidForService: false,
        prepaidForAll: false,
        isservice: false,
        isvoucher: false,
        isprepaid: false,
        iscompound: false,
      };
      await this.props
        .NewItemRanges(newreason)
        .then((data) => {
          this.Listofitemrange();
          range_active = false;
          range_code = "";
          range_desc = "";
          range_brand = "";
          this.setState({ range_brand, range_code, range_desc, range_active });
        })
        .catch((e) => console.log(e));
      this.handlerangeDialog();
    }
  };

  deleteitem = (ind) => {
    console.log("deleteitem", ind);
    let { subitemusage } = this.state;

    subitemusage = subitemusage.filter((x, index) => index !== ind);
    this.setState({
      subitemusage,
    });
    console.log(subitemusage);
  };

  deleteuom = (id) => {
    let { uomsde } = this.state;

    // Check if the UOM to be deleted is the last entered UOM
    if (uomsde.length > 0 && uomsde[uomsde.length - 1].id === id) {
      // If it's the last entered UOM, proceed with deletion
      uomsde = uomsde.filter((x) => x.id !== id);
      this.setState({
        uomsde,
      });
    } else {
      // If it's not the last entered UOM, show an alert
      alert(
        "Cannot Delete this UOM. You can delete the last entered UOM only."
      );
    }
  };
  packageShowEntries = ({ target: { value, name } }) => {
    let { count, per_page, packagePageMeta, salon, retail } = this.state;
    if (name == "count") {
      count = +value;
      per_page = +value;
      this.setState(
        {
          count,
          per_page,
          packagePageMeta: {
            ...packagePageMeta,
            per_page: per_page,
          },
        },
        () => this.listofpackagedtl()
      );
      console.log(count, per_page);
    }
  };

  handleuomarray = (uomitem, val) => {
    let { idval, uomsde } = this.state;
    console.log(uomitem, idval, val);
    let index = uomsde.findIndex((x) => x.id == idval);
    if (val == "1") {
      uomsde[index].itemPrice = uomitem;
    } else if (val == "2") {
      uomsde[index].itemCost = uomitem;
    } else {
      uomsde[index].minMargin = uomitem;
    }
    this.setState({
      uomsde,
    });
    console.log(uomsde);
  };
  handleuomprice = (idno) => {
    let { uomsde, idval, uomprice } = this.state;
    console.log(idno);
    let objIndex = uomsde.findIndex((obj) => obj.id == idno);
    uomsde[objIndex].itemPrice = uomprice;
    this.setState({
      uomsde,
    });
    console.log(uomsde);
  };
  linkcodecondition = (runningcode) => {
    let { linklist, linkcodenew, item_active } = this.state;

    if (linklist.length > 0) {
      linklist.map((x, index) => {
        linkcodenew = {
          linkCode: x.linkCode,
          itemCode: runningcode,
          linkDesc: x.linkDesc,
          linkFactor: 0,
          linkType: x.linkType,
          itmIsactive: item_active == true ? true : x.itmIsactive,
          rptCodeStatus: x.rptCodeStatus,
        };
        this.finallinkcode(linkcodenew);
      });
    }
  };

  finallinkcode = async (newitem) => {
    await this.props
      .NewItemLinks(newitem)
      .then((data) => {
        console.log("prepaiddsdsdsdsdd");
      })
      .catch((e) => console.log(e));
  };

  prepaidopencondition = (runningcode) => {
    let {
      prepaidftable,
      prepaidamount,
      prepaidamountone,
      card_noacc,
      validity,
      control_no,
      prepaidnew,
    } = this.state;
    if (prepaidftable.length > 0) {
      prepaidftable.map((x, index) => {
        console.log(x, "prepaidConditionX");
        prepaidnew = {
          pItemtype: x.type,
          itemCode: runningcode,
          conditiontype1: x.condition1,
          conditiontype2: x.condition2,
          // prepaidValue: prepaidamountone,
          amount: x.price,
          // prepaidValidPeriod: validity,
          rate: x.price,
          isactive: true,
          membercardnoaccess: card_noacc,
          // uid: "",
          // macUidRef: "",
          // ppUidRef: null,
        };
        this.finalpre(prepaidnew);
      });
    }
  };

  finalpre = async (newitem) => {
    await this.props
      // .NewPrepaidOpenConditions(newitem)
      .NewVoucherConditions(newitem)
      .then((data) => {
        console.log("prepaiddsdsdsdsdd");
      })
      .catch((e) => console.log(e));
  };

  finaluomprice = (runningcode) => {
    let { uomsde, uomnew } = this.state;

    if (uomsde.length > 0) {
      uomsde.map((x, index) => {
        uomnew = {
          itemCode: runningcode,
          itemUom: x.itemUom,
          uomDesc: x.uomDesc,
          uomUnit: x.uomUnit,
          itemUom2: x.itemUom2,
          uom2Desc: x.uom2Desc,
          itemPrice: x.itemPrice,
          itemCost: x.itemCost,
          minMargin: x.minMargin,
          isactive: x.isactive,
          itemUompriceSeq: x.itemUompriceSeq,
          deleteUser: x.deleteUser,
          deleteDate: x.deleteDate,
        };
        this.finaluomlist(uomnew);
      });
      return true;
    } else {
      Toast({
        type: "error",
        message: "UOM should not empty ",
      });
      return false;
    }
  };

  finaluomlist = async (newitem) => {
    await this.props
      .NewItemUomprices(newitem)
      .then((data) => {
        console.log("uomlist");
      })
      .catch((e) => console.log(e));
  };

  updatebatch = async (no, site_code, uom1, uom2) => {
    console.log(site_code, no, uom1, uom2);
    let { newbatch, stocklist, item_active, newstock } = this.state;
    for (let i = 0; i <= stocklist.length - 1; i++) {
      if (stocklist[i].itemsiteIsactive == true) {
        if (uom1 == uom2) {
          newbatch = {
            itemCode: no,
            siteCode: stocklist[i].itemsiteCode,
            batchNo: "",
            uom: uom1,
            qty: 0,
            expDate: new Date(),
            batchCost: "",
            isActive:
              item_active == true ? true : stocklist[i].itemsiteIsactive,
          };
          await this.props
            .ItemBatches(newbatch)
            .then((data) => {
              console.log("batchap");
            })
            .catch((e) => console.log(e));
        } else {
          if (uom1 != null) {
            newbatch = {
              itemCode: no,
              siteCode: stocklist[i].itemsiteCode,
              batchNo: "",
              uom: uom1,
              qty: 0,
              expDate: new Date(),
              batchCost: "",
              isActive:
                item_active == true ? true : stocklist[i].itemsiteIsactive,
            };
            await this.props
              .ItemBatches(newbatch)
              .then((data) => {
                console.log("batchapi1 succ");
              })
              .catch((e) => console.log(e));
          }
          // if (uom2 != null) {
          //   newbatch = {
          //     itemCode: no,
          //     siteCode: stocklist[i].itemsiteCode,
          //     batchNo: "",
          //     uom: uom2,
          //     qty: 0,
          //     expDate: new Date(),
          //     batchCost: "",
          //     isActive:
          //       item_active == true ? true : stocklist[i].itemsiteIsactive,
          //   };
          //   await this.props
          //     .ItemBatches(newbatch)
          //     .then((data) => {
          //       console.log("batchapi2 succ");
          //     })
          //     .catch((e) => console.log(e));
          // }
        }
      }
    }
  };

  itembatchapi = (no) => {
    let { sitecode, uom1, uom2, uomsde } = this.state;
    if (uomsde.length > 0) {
      uomsde.map((x, index) => {
        uom1 = x.itemUom;
        uom2 = x.itemUom2;
        this.updatebatch(no, sitecode, uom1, uom2);
      });
    }
  };
  packageradio(event) {
    let { disc_method } = this.state;
    disc_method = event.target.value;
    this.setState({ disc_method });
  }

  getItemcode = (code) => {
    if (!code) return code;
    return (String(code) + "0000").substring(0, 12);
  };
  Itemusagelist = () => {
    let { subitemusage, newdetails, stocklist, control_no } = this.state;
    console.log(subitemusage, "subItemusage");
    let newData = [];
    subitemusage.map((x, index) => {
      newdetails = {
        serviceCode: `${control_no}0000`,
        itemCode: this.getItemcode(x.ItemCode),
        qty: x.Quantity,
        uom: x.UOM,
        sequence: null,
        serviceDesc: x.Description,
        itemDesc: x.Description,
        isactive: x.Active,
      };
      newData.push(newdetails);
    });

    this.finalitemusagelist(newData);
    console.log(newData, "newDetails");
  };

  finalitemusagelist = async (newitem) => {
    await this.props
      .NewUsagelevels(newitem)
      .then((data) => {
        console.log("Itemusagelist list");
      })
      .catch((e) => console.log(e));
  };

  finalpackage = () => {
    let {
      package_content,
      newdtails,
      stocklist,
      itemsiteCode,
      control_no,
      newPackageDtls,
    } = this.state;
    // for (let i = 0; i <= stocklist.length - 1; i++) {
    //   if (stocklist[i].itemsiteIsactive == true) {
    package_content.map((x, index) => {
      newdtails = {
        code: `${x.Item_Code}0000`,
        description: x.Description,
        cost: null,
        price: Number(x.P_Price),
        discount: Number(x.Unit_Disc),
        packageCode: control_no,
        qty: Number(x.Qty),
        uom: x.UOM,
        itemDiv: x.package_div,
        packageBarcode: null,
        discPercent: null,
        unitPrice: Number(x.U_Price),
        ttlUprice: Math.round(x.Total_Amount),
        siteCode: this.props.tokenDetails.controlsite,
        lineNo: index + 1,
        serviceExpireActive: this.state.serviceExpireActive,
        serviceExpireMonth: this.state.serviceExpireMonth,
        treatmentLimitActive: this.state.treatmentLimitActive,
        treatmentLimitCount: this.state.treatmentLimitCount,
        limitserviceFlexionly: this.state.limitserviceFlexionly,
        isactive: true,
      };
      newPackageDtls.push(newdtails);
    });
    //   }
    // }
    this.finalpackagelist(newPackageDtls);
  };

  finalpackagelist = async (newitem) => {
    await this.props
      .NewPackageDtls(newitem)
      .then((data) => {
        console.log("Pacakkkakak");
      })
      .catch((e) => console.log(e));
  };

  finalPackageHdrs = async (control_no) => {
    let {
      newdtails,
      package_discount,
      package_price,
      from_date,
      to_date,
      start_time,
      to_time,
      content_total,
      disc_amount,
      package_total,
    } = this.state;
    let formated_date = from_date.toISOString().slice(0, 10);
    newdtails = {
      code: control_no,
      description: this.state.stockname,
      price: package_total,
      discount: disc_amount,
      dateCreated: new Date(),
      timeCreated: new Date(),
      userName: null,
      packageBarcode: control_no,
      unitPrice: content_total,
      fromDate: formated_date,
      toDate: this.state.to_date,
      fromTime: this.state.start_time, // Use the selected time
      toTime: this.state.to_time, // Use the selected time
      siteCode: this.props.tokenDetails.controlsite,
      manualDisc: this.state.disc_method !== "Manual" ? false : true,
      istdt: this.state.Appt_TDT,
      apptlimit: this.state.appt,
    };
    await this.props
      .NewPackageHdrs(newdtails)
      .then((data) => {
        console.log("PackageHRd");
      })
      .catch((e) => console.log(e));
  };

  deletepackage = (Code) => {
    let {
      package_content,
      package_uom,
      package_qty,
      content_total,
      package_total,
      package_div,
      package_code,
      package_name,
      package_price,
      package_discount,
    } = this.state;

    package_content = package_content.filter((x) => x.Item_Code !== Code);
    this.setState({ package_content });

    console.log(package_content);

    package_code = "";
    package_name = "";
    package_uom = "";
    package_price = "";
    package_qty = "";
    package_div = null;
    package_discount = 0;
    this.setState({
      package_code,
      package_name,
      package_uom,
      package_price,
      package_qty,
      package_div,
      package_discount,
    });

    package_total = 0;
    this.setState({ package_total });
    package_content.map((x, index) => {
      console.log(x.P_Price);
      console.log(package_total);
      package_total = (Number(package_total) + Number(x.P_Price)).toFixed(2);
      console.log(package_total);
    });
    this.setState({ package_total });
    console.log(package_total);

    content_total = 0;
    package_total = 0;
    this.setState({ content_total, package_total });
    package_content.map((x, index) => {
      console.log(x.P_Price);
      console.log(content_total, package_content);
      content_total = (Number(content_total) + Number(x.U_Price)).toFixed(2);
      package_total = content_total;
      console.log(content_total);
    });
    this.setState({ content_total, package_total });
    console.log(content_total);
  };

  applydiscount = (discount) => {
    let { package_content, content_total, temp_tt, temp_tp, temp_dis } =
      this.state;
    console.log(package_content, "package_content");

    const totalPackageAmount = package_content.reduce(
      (total, x) => total + x.Total,
      0
    );
    const discountPercentage = discount / totalPackageAmount;
    console.log(temp_tt);
    package_content.map((x, index) => {
      const discountForPackage = x.Total * discountPercentage;
      temp_tt = (x.Total - discountForPackage) / x.Total;
      temp_tp = (temp_tt * x.Total).toFixed(4);
      temp_dis = (discountForPackage / Number(x.Qty)).toFixed(4);
      console.log(content_total, temp_tt, temp_tp, temp_dis, "tempDis");
      this.changepackage(index, temp_tp, temp_dis);
    });
  };

  changepackage = (id, price, discount) => {
    let { package_content, objIndex, package_total } = this.state;
    objIndex = package_content.findIndex((obj, index) => index == id);
    console.log(objIndex, "objIndex");
    const newPrice = (package_content[objIndex].U_Price - discount).toFixed(4);
    package_content[objIndex].Unit_Disc = discount;
    package_content[objIndex].P_Price = newPrice;
    package_content[objIndex].Total_Amount = price;
    package_total = 0;
    this.setState(package_content);
    console.log(package_content, "packageCon");
    this.calculatetotalprice(package_total);
  };
  calculatetotalprice = (total) => {
    console.log("Chek");
    let { package_total, package_content } = this.state;

    package_total = total;
    this.setState({ package_total });
    package_content.map((x, index) => {
      console.log(x.P_Price);
      console.log(package_total, "packageTotal");
      package_total = (Number(package_total) + Number(x.Total_Amount)).toFixed(
        2
      );
      console.log(package_total);
    });
    this.setState({ package_total });
    console.log(package_total);
  };

  selectcode = (code) => {
    let {
      package_code,
      package_name,
      package_uom,
      package_price,
      package_qty,
      package_discount,
      package_content,
      package_div,
    } = this.state;
    let objIndex = package_content.findIndex((obj) => obj.Item_Code == code);
    console.log(package_content[objIndex]);
    package_code = package_content[objIndex].Item_Code;
    package_name = package_content[objIndex].Description;
    package_price = package_content[objIndex].U_Price;
    package_uom = package_content[objIndex].UOM;
    package_qty = package_content[objIndex].Qty;
    package_div = package_content[objIndex].package_div;
    package_discount = package_content[objIndex].Unit_Disc;

    this.setState({
      package_code,
      package_name,
      package_uom,
      package_price,
      package_qty,
      package_div,
      package_discount,
    });
  };

  insertpackage = (
    package_code,
    package_uom,
    package_qty,
    package_name,
    package_price,
    package_discount,
    package_div
  ) => {
    console.log(
      package_code,
      package_uom,
      package_qty,
      package_div,
      package_name,
      package_price,
      package_discount,
      "packageTest"
    );
    let {
      temp_content,
      temp_price,
      temp_total,
      package_content,
      content_total,
      package_total,
    } = this.state;

    temp_price = package_qty * package_price;
    content_total = 0;
    let tempDiscount = Number(package_discount) / Number(package_qty);
    temp_total = temp_price - package_discount;
    package_total = temp_total;
    this.setState({ temp_price, temp_total, package_total, content_total });
    console.log(content_total);
    console.log(temp_price);
    if (package_content.length > 0) {
      let objIndex = package_content.findIndex(
        (obj) => obj.Item_Code == package_code
      );
      if (objIndex != -1) {
        package_content[objIndex].Item_Code = package_code;
        package_content[objIndex].Description = package_name;
        package_content[objIndex].Qty = package_qty;
        package_content[objIndex].U_Price = package_price;
        package_content[objIndex].Total = temp_price;
        package_content[objIndex].Unit_Disc = tempDiscount;
        package_content[objIndex].P_Price = package_price - tempDiscount;
        package_content[objIndex].Total_Amount = temp_total;
        package_content[objIndex].UOM = package_uom;
        package_content[objIndex].package_div = package_div;
        package_content[objIndex].Active = "Yes";
        this.setState({
          package_content,
        });
      } else {
        temp_content = {
          Item_Code: package_code,
          Description: package_name,
          Qty: package_qty,
          U_Price: package_price,
          Total: temp_price,
          Unit_Disc: tempDiscount,
          P_Price: package_price - tempDiscount,
          Total_Amount: temp_total,
          UOM: package_uom,
          package_div: package_div,
          Active: "yes",
        };
        package_content.push(temp_content);
        this.setState({
          package_content,
        });
      }
    } else {
      temp_content = {
        Item_Code: package_code,
        Description: package_name,
        Qty: package_qty,
        U_Price: package_price,
        Total: temp_price,
        Unit_Disc: tempDiscount,
        P_Price: package_price - tempDiscount,
        Total_Amount: temp_total,
        UOM: package_uom,
        package_div: package_div,
        Active: "yes",
      };
      console.log(temp_content, "content");
      package_content.push(temp_content);
    }
    this.setState({ package_content });
    console.log(package_content, package_content.length);
    this.calculatetotal(content_total);

    package_code = "";
    package_name = "";
    package_uom = "";
    package_price = "";
    package_qty = "";
    package_div = "";
    package_discount = 0;
    this.setState({
      package_code,
      package_name,
      package_uom,
      package_price,
      package_qty,
      package_div,
      package_discount,
    });
  };

  calculatetotal = (ct) => {
    console.log(ct, "calTotal");
    let { package_content, content_total, package_total } = this.state;
    content_total = ct;
    package_total = ct;
    this.setState({ content_total, package_total });
    package_content.map((x, index) => {
      console.log(x, "xtotal");
      console.log(x.P_Price);
      console.log(content_total, package_content);
      content_total = (Number(content_total) + Number(x.Total)).toFixed(2);
      package_total = (Number(package_total) + Number(x.Total_Amount)).toFixed(
        2
      );
      console.log(content_total);
    });
    this.setState({ content_total, package_total });
    console.log(content_total);
  };
  // totimechange = ({ target: { value, name } }) => {
  //   let { to_time } = this.state;
  //   to_time = value;
  //   this.setState({ to_time });
  //   console.log(to_time);
  // };

  // fromtimechange = ({ target: { value, name } }) => {
  //   let { start_time } = this.state;
  //   start_time = value;
  //   this.setState({ start_time });
  //   console.log(start_time);
  // };

  fromtimechange = ({ target: { value, name } }) => {
    // Assuming value is in HH:mm format
    this.setState({ start_time: value });
    console.log(value);
  };

  totimechange = ({ target: { value, name } }) => {
    // Assuming value is in HH:mm format
    this.setState({ to_time: value });
    console.log(value);
  };

  package = ({ target: { value, name } }) => {
    let {
      from_date,
      to_date,
      start_time,
      to_time,
      appt,
      Appt_TDT,
      package_price,
      package_qty,
      package_discount,
      content_total,
      disc_amount,
      package_total,
      packagedeptvalue,
      searchone,
      vilidityFromDate,
      vilidityToDate,
    } = this.state;
    if (name == "packagedeptvalue") {
      packagedeptvalue = value;
      searchone = value;
      this.setState({ packagedeptvalue, searchone });
    }
    if (name == "from_date") {
      from_date = value;
      this.setState({ from_date });
    }
    if (name == "to_date") {
      to_date = value;
      this.setState({ to_date });
    }
    if (name == "vilidityFromDate") {
      vilidityFromDate = value;
      this.setState({ vilidityFromDate });
    }
    if (name == "vilidityToDate") {
      vilidityToDate = value;
      this.setState({ vilidityToDate });
    }
    if (name == "start_time") {
      start_time = value;
      this.setState({ start_time });
    }

    if (name == "to_time") {
      to_time = value;
      this.setState({ to_time });
    }
    if (name == "appt") {
      appt = value;
      this.setState({ appt });
    }
    if (name == "Appt_TDT") {
      Appt_TDT = value;
      this.setState({ Appt_TDT });
    }
    if (name == "package_price") {
      package_price = value;
      this.setState({ package_price });
    }
    if (name == "package_qty") {
      package_qty = value;
      this.setState({ package_qty });
    }
    if (name == "package_discount") {
      package_discount = value;
      this.setState({ package_discount });
    }
    if (name == "content_total") {
      content_total = value;
      this.setState({ content_total });
    }
    if (name == "disc_amount") {
      disc_amount = value;
      this.setState({ disc_amount });
    }
    if (name == "package_total") {
      package_total = value;
      this.setState({ package_total });
    }
  };

  updateitemusage = async (salon, retail) => {
    let {
      itemusage,
      Itemdata,
      pageCount,
      current_page,
      pageMeta,
      per_page,
      stockData,
    } = this.state;
    itemusage = stockData
      .filter((key) => {
        if (salon && key.division === "2") {
          return true;
        }
        if (retail && key.division === "1") {
          return true;
        }
        return false;
      })
      .map((key) => ({
        division: key.division,
        Description: key.Description,
        ItemCode: key.ItemCode,
        barcode: key.barcode,
      }));
    if (itemusage.length === 0) {
      this.setState({
        Itemdata: [],
        pageMeta: { ...pageMeta, total_pages: 0 },
      });
      return;
    }
    itemusage.sort((a, b) => a.Description.localeCompare(b.Description));
    Itemdata = itemusage.slice(
      (current_page - 1) * per_page,
      (current_page - 1) * per_page + per_page
    );
    pageCount = Math.ceil(itemusage.length / per_page);
    this.setState({
      Itemdata,
      pageMeta: { ...pageMeta, total_pages: pageCount },
    });
  };

  itemusagestock = ({ target: { value, name } }) => {
    let { salon, retail } = this.state;
    console.log(salon, "salon list");
    console.log(retail, "retail list");
    if (name == "salon") {
      salon = value;
      this.setState({ salon });
      this.updateitemusage(salon, retail);
    }
    if (name == "retail") {
      retail = value;
      this.setState({ retail });
      this.updateitemusage(salon, retail);
    }
  };

  addpackage = (code, name, uom, price, qty, division) => {
    let {
      package_code,
      package_name,
      package_uom,
      package_price,
      package_qty,
      package_div,
    } = this.state;

    package_code = code;
    package_name = name;
    package_price = price;
    package_uom = uom;
    package_qty = 1;
    package_div = division;

    this.setState({
      package_code,
      package_name,
      package_uom,
      package_price,
      package_qty,
      package_div,
    });
  };

  filterByName = ({ target: { value, name } }) => {
    console.log(value, name);
    let { itemusage, filterdata, search, seachdata, pageCount, stockData } =
      this.state;
    if (name == "search") {
      search = value;
      this.setState({ search });
    }
    if (search !== "") {
      filterdata = stockData.filter((item) => {
        return Object.values(item)
          .join("")
          .toLowerCase()
          .includes(search.toLowerCase());
      });
    } else {
      filterdata = stockData;
    }
    seachdata = filterdata.slice(
      this.state.offset,
      this.state.offset + this.state.per_page
    );

    pageCount = Math.ceil(filterdata.length / this.state.per_page);

    this.setState({ seachdata, pageCount });
  };

  filterByPackageName = ({ target: { value, name } }) => {
    let {
      filterPackageDetails,
      filterdataone,
      searchone,
      seachdata,
      seachpackagedata,
      pageCount,
      newFilterData,
    } = this.state;
    if (name == "search") {
      searchone = value;
      this.setState({ searchone });
    }
    if (searchone !== "") {
      newFilterData = filterPackageDetails.filter((item) => {
        return Object.values(item)
          .join("")
          .toLowerCase()
          .includes(searchone.toLowerCase());
      });
    } else {
      newFilterData = filterPackageDetails;
    }
    seachpackagedata = newFilterData.slice(
      this.state.offset,
      this.state.offset + this.state.per_page
    );
    pageCount = Math.ceil(filterdataone.length / this.state.per_page);
    this.setState({
      filterPackageDetails,
      filterdataone,
      seachpackagedata,
      pageCount,
    });
  };

  filterBydept = ({ target: { value, name } }) => {
    let {
      filterPackageDetails,
      filterdataone,
      searchone,
      seachpackagedata,
      pageCount,
    } = this.state;
    console.log(filterdataone, "filterdataonerange");
    if (searchone !== "") {
      filterdataone = filterPackageDetails.filter((item) => {
        return Object.values(item.department)
          .join("")
          .toLowerCase()
          .includes(searchone.toLowerCase());
      });
    }
    this.setState({ filterdataone });
    seachpackagedata = filterdataone.slice(
      this.state.offset,
      this.state.offset + this.state.per_page
    );

    pageCount = Math.ceil(filterdataone.length / this.state.per_page);
    this.setState({ seachpackagedata, pageCount });
  };

  Additem = async () => {
    if (
      this.state.stockdivision == null ||
      this.state.dept == null ||
      this.state.stockclass == null ||
      this.state.brand == null ||
      this.state.stockname == null ||
      this.state.stocktype == null ||
      this.state.range == null
    ) {
      Toast({
        type: "error",
        message: "Please check General required field",
      });
    } else {
      let { check } = this.state;
      check = true;
      this.setState({ check, is_component_loading: true });
      if (this.state.stockdivision == "1" || this.state.stockdivision == "2") {
        if (this.state.supply_itemsval == null) {
          Toast({
            type: "error",
            message: "Please check required field",
          });
          check = false;
          this.setState({ check });
          this.setState({ is_component_loading: false });
        }
        if (this.state.tax == true) {
          if (this.state.taxone == null && this.state.taxtwo == null) {
            Toast({
              type: "error",
              message: "Please check Tax required field",
            });
            check = false;
            this.setState({ check });
          }
        }
        if (this.state.commissionable == true) {
          if (
            this.state.work_commission == null ||
            this.state.sales_point == null ||
            this.state.work_point == null ||
            this.state.Sales_commission == null
          ) {
            Toast({
              type: "error",
              message: "Please check commissionable required field",
            });
            check = false;
            this.setState({ check });
          }
        }
      } else {
        if (this.state.tax == true) {
          if (this.state.taxone == null && this.state.taxtwo == null) {
            Toast({
              type: "error",
              message: "Please check Tax required field",
            });
            check = false;
            this.setState({ check });
            this.setState({ is_component_loading: false });
          }
        } else if (this.state.commissionable == true) {
          if (
            this.state.work_commission == null ||
            this.state.sales_point == null ||
            this.state.work_point == null ||
            this.state.Sales_commission == null
          ) {
            Toast({
              type: "error",
              message: "Please check commissionable required field",
            });
            check = false;
            this.setState({ check });
            this.setState({ is_component_loading: false });
          }
        }
      }
      if (check == true) {
        let { control_no, tem_no, stock_data, getControlNo, getControlId } =
          this.state;

        let prefix = control_no.toString().slice(0, 3);
        let matchingItems = stock_data.filter(
          (item) => item.itemCode && item.itemCode.startsWith(prefix)
        );
        if (matchingItems.length > 0) {
          let tem_no = matchingItems[matchingItems.length - 1].itemCode;
          tem_no = tem_no.slice(tem_no.length - 5);
          let incrementedTemNo = (parseInt(tem_no, 10) + 1)
            .toString()
            .padStart(tem_no.length, "0");
          control_no = control_no.toString() + incrementedTemNo;

          // tem_no = stock_data[stock_data.length - 1].itemCode;
          // tem_no = tem_no.slice(tem_no.length - 5);
          // console.log(tem_no, "temNo");
          // tem_no = Number(tem_no) + 1;
          // control_no = control_no + tem_no;
          if (control_no.length > 8) {
            control_no = control_no.slice(0, 8);
          }
          // let newControlNo = {
          //   controlNo: Number(getControlNo) + 1,
          // };
          // await this.props.UpdateControlNo(
          //   `ControlNos/update?where=%7B%22controlId%22%3A%20${getControlId}%7D`,
          //   newControlNo
          // );
          this.setState({ control_no });
        } else {
          tem_no = 1;
          control_no = control_no + tem_no;
          this.setState({ control_no });
        }
        let {
          stocklist,
          newstock,
          newStock,
          vilidityFromDate,
          vilidityToDate,
          from_date,
          to_date,
          stocktype,
        } = this.state;
        let formattedFromDate = vilidityFromDate.toISOString().slice(0, 10);
        let formattedToDate = vilidityToDate.toISOString().slice(0, 10);
        let packageFromDate = from_date.toISOString().slice(0, 10);
        let packageToDate = to_date.toISOString().slice(0, 10);
        for (let i = 0; i <= stocklist.length - 1; i++) {
          newstock = {
            itemCode: control_no,
            itemBarcode: control_no + "0000",
            itemsiteCode: stocklist[i].itemsiteCode,
            onhandQty: 0,
            itemstocklistMinqty: 0,
            itemstocklistMaxqty: 0,
            onhandCst: 0,
            itemstocklistOnhandcost: null,
            itemstocklistUnit: null,
            itemstocklistUser: "HS01100003",
            itemstocklistDatetime: new Date(),
            itemstocklistRemark: null,
            itemstocklistPosted: false,
            itemstocklistStatus: stocklist[i].itemsiteIsactive,
            lstpoUcst: 0,
            lstpoNo: null,
            lstpoDate: new Date(),
            costPrice: 0,
            itmSeq: null,
          };
          newStock.push(newstock);
        }
        await this.props
          .NewItemStocklists(newStock)
          .then((data) => {
            // let formData = new FormData();
            // formData.append(`Stock_PIC`, this.state.images);
            // formData.append(`item_code`, control_no);
            // this.props
            //   .commonCreateApi(`stockimageupload/`, formData)
            //   .then((res) => {
            //     // this.Listofpaygroups({});
            //     Toast({
            //       type: "success",
            //       message: "Successfully Added",
            //     });
            //   })
            //   .catch((e) => console.log(e));
          })
          .catch((e) => console.log(e));
        if (this.state.stockdivision == "5") {
          this.prepaidopencondition(control_no);
        }
        if (
          this.state.stockdivision == "3" ||
          this.state.stockdivision == "2"
        ) {
          this.finalpackage();
          this.finalPackageHdrs(control_no);
          this.Itemusagelist();
          if (this.state.stockdivision == "3") {
            this.addItemFlexi();
          }
        }
        if (this.state.stockdivision !== "5") {
          this.linkcodecondition(control_no);
        }
        if (
          this.state.stockdivision == "1" ||
          this.state.stockdivision == "2"
        ) {
          this.itembatchapi(control_no);

          if (this.finaluomprice(control_no)) {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, "0");
            const day = String(currentDate.getDate()).padStart(2, "0");
            const hours = String(currentDate.getHours()).padStart(2, "0");
            const minutes = String(currentDate.getMinutes()).padStart(2, "0");
            const seconds = String(currentDate.getSeconds()).padStart(2, "0");
            const milliseconds = String(currentDate.getMilliseconds()).padStart(
              3,
              "0"
            );

            const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
            let { stockprice, stockdivision, vouchervalue, prepaidamount } =
              this.state;
            let newItemPrice =
              (!stockprice || stockprice == 0) && stockdivision == "4"
                ? Number(vouchervalue)
                : (!stockprice || stockprice == 0) && stockdivision == "5"
                ? Number(prepaidamount)
                : (!stockprice || stockprice == 0) &&
                  stockdivision == "3" &&
                  stocktype == "PACKAGE"
                ? Number(this.state.package_total)
                : stockprice;
            let newitem = {
              itemCode: control_no,
              itmIcid: null,
              itmCode: null,
              itemDiv: this.state.stockdivision,
              itemDept: this.state.dept,
              itemClass: this.state.stockclass,
              itemBarcode: this.state.ItemBarCode,
              onhandCst: this.state.uomcost == null ? null : this.state.uomcost,
              itemMargin:
                this.state.uommargin == null ? null : this.state.uommargin,
              itemIsactive: this.state.item_active,
              itemName: this.state.stockname,
              itemAbbc: null,
              itemDesc: this.state.item_desc,
              costPrice: "",
              itemPrice: newItemPrice,
              itemPriceFloor: this.state.floorprice,
              itemPriceCeiling: this.state.priceceiling,
              onhandQty: null,
              itmPromotionyn: null,
              itmDisc: null,
              itmCommission: null,
              itemType: this.state.stocktype,
              itmDuration: this.state.duration,
              itmPoint: null,
              itemPrice2: null,
              itemPrice3: null,
              itemPrice4: null,
              itemPrice5: null,
              itmRemark: null,
              itmValue: null,
              itmExpiredate: null,
              itmStatus: null,
              itemMinqty: null,
              itemMaxqty: null,
              itemOnhandcost: null,
              itemBarcode1: null,
              itemBarcode2: null,
              itemBarcode3: null,
              itemMarginamt: null,
              itemDate: formattedDateTime,
              itemTime: formattedDateTime,
              itemModdate: formattedDateTime,
              itemModtime: formattedDateTime,
              itemCreateuser: localStorage.getItem("username"),
              itemSupp: this.state.supply_itemsval,
              itemParentcode: null,
              itemColor: null,
              itemSizepack: null,
              itemSize: null,
              itemSeason: null,
              itemFabric: null,
              itemBrand: this.state.brand,
              lstpoUcst: null,
              lstpoNo: null,
              lstpoDate: null,
              itemHavechild: false,
              valueApplytochild: false,
              packageDisc: null,
              havePackageDisc: false,
              picPath: this.state.images,
              itemFoc: this.state.customer_replan,
              itemUom: this.state.uomcode,
              isGst: false,
              //itemSize:this.state.
              mixbrand: false,
              serviceretail: null,
              itemRange: this.state.range,
              commissionable: this.state.commissionable,
              trading: false,
              custReplenishDays: this.state.Replenishment,
              custAdvanceDays: this.state.Remind_advance,
              salescomm: this.state.Sales_commission,
              workcomm: this.state.work_commission,
              reminderActive: this.state.redeem_item,
              disclimit: this.state.disclimit,
              ItemBarCode: null,
              disctypeamount: true,
              autocustdisc: this.state.auto_cust_disc,
              reorderActive: this.state.reoreder_level,
              //reorderActive: this.state.expirystatus,
              reorderMinqty: this.state.min_qty,
              serviceExpireActive: this.state.serviceExpireActive,
              serviceExpireMonth: this.state.serviceExpireMonth,
              treatmentLimitActive: this.state.treatmentLimitActive,
              treatmentLimitCount: this.state.treatmentLimitCount,
              limitserviceFlexionly: this.state.limitserviceFlexionly,
              salescommpoints: this.state.sales_point,
              workcommpoints: this.state.work_point,
              itemPriceFloor: this.state.floorprice,
              itemPriceCeiling: this.state.priceceiling,
              voucherValue: this.state.vouchervalue,
              voucherValueIsAmount: this.state.vouchervalid,
              voucherValidPeriod: this.state.validity,
              prepaidValue: this.state.prepaidamountone,
              prepaidSellAmt: this.state.prepaidamount,
              flexiPoints: this.state.flexiPoints,
              prepaidValidPeriod: this.state.valid,
              membercardnoaccess: true,
              rptCode: this.state.rptcode,
              accountCode: "",
              isOpenPrepaid: false,
              apptWdMin: null,
              istnc: null,
              serviceCost: false,
              serviceCostPercent: false,
              accountCodeTd: this.state.account_no,
              voucherIsvalidUntilDate: false,
              voucherValidUntilDate: this.state.validvoucherdate,
              t1TaxCode: this.state.taxone,
              isHaveTax: this.state.tax,
              t2TaxCode: this.state.taxtwo,
              isAllowFoc: this.state.allow_foc,
              vilidityFromDate:
                stocktype == "PACKAGE"
                  ? packageFromDate
                  : formattedFromDate
                  ? formattedFromDate
                  : null,
              vilidityToDate:
                stocktype == "PACKAGE"
                  ? packageToDate
                  : formattedToDate
                  ? formattedToDate
                  : null,
              vilidityFromTime: null,
              vilidityToTime: null,
              equipmentcost: null,
              postatus: null,
              moqqty: null,
              printdesc: this.state.membershipPoint,
              printlineno: null,
              itemClassIdId: this.state.itemClassIdId,
              itemDeptIdId: this.state.itemDeptIdId,
              itemDivIdId: this.state.itemDivIdId,
              itemRangeIdId: this.state.itemRangeIdId,
              itemTypeIdId: this.state.itemTypeIdId,
              printuom: null,
              item_seq: this.state.item_seq,
            };
            await this.props
              .NewStocks(newitem)
              .then((data) => {
                Toast({
                  type: "success",
                  message: "Successfully Added",
                });
                let formData = new FormData();

                formData.append(`Stock_PIC`, this.state.images);
                formData.append(`item_code`, control_no);

                this.props
                  .commonCreateApi(`stockimageupload/`, formData)
                  .then((res) => {
                    // this.Listofpaygroups({});
                    Toast({
                      type: "success",
                      message: "Successfully Added",
                    });
                  })
                  .catch((e) => console.log(e));
                this.handlefinalinput();
                this.setState({ is_component_loading: false });
              })
              .catch((e) => console.log(e));
          }
        } else {
          const currentDate = new Date();
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, "0");
          const day = String(currentDate.getDate()).padStart(2, "0");
          const hours = String(currentDate.getHours()).padStart(2, "0");
          const minutes = String(currentDate.getMinutes()).padStart(2, "0");
          const seconds = String(currentDate.getSeconds()).padStart(2, "0");
          const milliseconds = String(currentDate.getMilliseconds()).padStart(
            3,
            "0"
          );

          const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
          let { stockprice, stockdivision, vouchervalue, prepaidamount } =
            this.state;
          let newItemPrice =
            (!stockprice || stockprice == 0) && stockdivision == "4"
              ? Number(vouchervalue)
              : (!stockprice || stockprice == 0) && stockdivision == "5"
              ? Number(prepaidamount)
              : (!stockprice || stockprice == 0) &&
                stockdivision == "3" &&
                stocktype == "PACKAGE"
              ? Number(this.state.package_total)
              : stockprice;
          let newitem = {
            itemCode: control_no,
            itmIcid: null,
            itmCode: null,
            itemDiv: this.state.stockdivision,
            itemDept: this.state.dept,
            itemClass: this.state.stockclass,
            itemBarcode: this.state.ItemBarCode,
            onhandCst: this.state.uomcost == null ? null : this.state.uomcost,
            itemMargin:
              this.state.uommargin == null ? null : this.state.uommargin,
            itemIsactive: this.state.item_active,
            itemName: this.state.stockname,
            itemAbbc: null,
            itemDesc: this.state.item_desc,
            costPrice: "",
            itemPrice: newItemPrice,
            itemPriceFloor: this.state.floorprice,
            itemPriceCeiling: this.state.priceceiling,
            onhandQty: null,
            itmPromotionyn: null,
            itmDisc: null,
            itmCommission: null,
            itemType: this.state.stocktype,
            itmDuration: this.state.duration,
            itmpoint: null,
            itemPrice2: null,
            itemPrice3: null,
            itemPrice4: null,
            itemPrice5: null,
            itmRemark: null,
            itmValue: null,
            itmExpiredate: null,
            itmStatus: null,
            itemMinqty: null,
            itemMaxqty: null,
            itemOnhandcost: null,
            itemBarcode1: null,
            itemBarcode2: null,
            itemBarcode3: null,
            itemMarginamt: null,
            itemDate: formattedDateTime,
            itemTime: formattedDateTime,
            itemModdate: formattedDateTime,
            itemModtime: formattedDateTime,
            itemCreateuser: localStorage.getItem("username"),
            itemSupp: this.state.supply_itemsval,
            itemParentcode: null,
            itemColor: null,
            itemSizepack: null,
            itemSize: null,
            itemSeason: null,
            itemFabric: null,
            itemBrand: this.state.brand,
            lstpoUcst: null,
            lstpoNo: null,
            lstpoDate: null,
            itemHavechild: false,
            valueApplytochild: false,
            packageDisc: null,
            havePackageDisc: false,
            picPath: this.state.images,
            itemFoc: this.state.customer_replan,
            itemUom: this.state.uomcode,
            isGst: false,
            mixbrand: false,
            serviceretail: null,
            itemRange: this.state.range,
            commissionable: this.state.commissionable,
            trading: false,
            custReplenishDays: this.state.Replenishment,
            custAdvanceDays: this.state.Remind_advance,
            salescomm: this.state.Sales_commission,
            workcomm: this.state.work_commission,
            reminderActive: this.state.redeem_item,
            disclimit: this.state.disclimit,
            ItemBarCode: null,
            disctypeamount: true,
            autocustdisc: this.state.auto_cust_disc,
            reorderActive: this.state.reoreder_level,
            //reorderActive: this.state.expirystatus,
            reorderMinqty: this.state.min_qty,
            serviceExpireActive: this.state.serviceExpireActive,
            serviceExpireMonth: this.state.serviceExpireMonth,
            treatmentLimitActive: this.state.treatmentLimitActive,
            treatmentLimitCount: this.state.treatmentLimitCount,
            limitserviceFlexionly: this.state.limitserviceFlexionly,
            salescommpoints: this.state.sales_point,
            workcommpoints: this.state.work_point,
            itemPriceFloor: this.state.floorprice,
            itemPriceCeiling: this.state.priceceiling,
            voucherValue: this.state.vouchervalue,
            voucherValueIsAmount: this.state.vouchervalid,
            voucherValidPeriod: this.state.validity,
            prepaidValue: this.state.prepaidamountone,
            prepaidSellAmt: this.state.prepaidamount,
            flexiPoints: this.state.flexiPoints,
            prepaidValidPeriod: this.state.valid,
            membercardnoaccess: this.state.card_noacc,
            rptCode: this.state.rptcode,
            accountCode: "",
            isOpenPrepaid: false,
            apptWdMin: null,
            istnc: null,
            serviceCost: false,
            serviceCostPercent: false,
            accountCodeTd: this.state.account_no,
            voucherIsvalidUntilDate: false,
            voucherValidUntilDate: this.state.validvoucherdate,
            t1TaxCode: this.state.taxone,
            isHaveTax: this.state.tax,
            t2TaxCode: this.state.taxtwo,
            isAllowFoc: this.state.allow_foc,
            vilidityFromDate:
              stocktype == "PACKAGE"
                ? packageFromDate
                : formattedFromDate
                ? formattedFromDate
                : null,
            vilidityToDate:
              stocktype == "PACKAGE"
                ? packageToDate
                : formattedToDate
                ? formattedToDate
                : null,
            vilidityFromTime: null,
            vilidityToTime: null,
            equipmentcost: null,
            postatus: null,
            moqqty: null,
            printdesc: this.state.membershipPoint,
            printlineno: null,
            itemClassIdId: this.state.itemClassIdId,
            itemDeptIdId: this.state.itemDeptIdId,
            itemDivIdId: this.state.itemDivIdId,
            itemRangeIdId: this.state.itemRangeIdId,
            itemTypeIdId: this.state.itemTypeIdId,
            printuom: null,
            item_seq: this.state.item_seq,
          };
          console.log(newitem, "newItem");
          await this.props
            .NewStocks(newitem)
            .then((data) => {
              Toast({
                type: "success",
                message: "Successfully Added",
              });
              let formData = new FormData();

              formData.append(`Stock_PIC`, this.state.images);
              formData.append(`item_code`, control_no);

              this.props
                .commonCreateApi(`stockimageupload/`, formData)
                .then((res) => {
                  // this.Listofpaygroups({});
                  Toast({
                    type: "success",
                    message: "Successfully Added",
                  });
                })
                .catch((e) => console.log(e));
              this.handlefinalinput();
              this.setState({ is_component_loading: false });
              this.props.history.push(`/admin/backend/itemmaster`);
            })
            .catch((e) => console.log(e));
        }
      }
    }
  };
  handlefinalinput = () => {
    this.props.history.push(`/admin/backend`);
  };

  handleMinMarginChange = (event, item, index) => {
    const newMinMargin = event.target.value;
    const newItemCost = this.state.uomsde[index]["itemCost"];
    const newItemPrice = this.state.uomsde[index]["itemPrice"];

    if (newItemCost >= 0 && newItemPrice > 0) {
      let { uomsde } = this.state;

      if (newMinMargin === "") {
        // If the input is empty, set it to an empty string
        uomsde[index]["minMargin"] = "";
      } else {
        // If the input is not empty, remove any trailing decimal places
        const minMargin = parseFloat(newMinMargin);
        uomsde[index]["minMargin"] = minMargin.toFixed(1);
      }

      this.setState({ uomsde });
    }
  };

  handleItemPriceChange = (event, item, index) => {
    const newItemPrice = Number(event.target.value);
    if (newItemPrice > 0) {
      console.log(newItemPrice, "newitemusage price");
      let { uomsde } = this.state;
      const newItemCost = uomsde[index]["itemCost"];

      // Check if itemCost is already set, then calculate and display minMargin
      if (newItemCost > 0) {
        const remainingPrice = newItemPrice - newItemCost;
        uomsde[index]["minMargin"] = (
          (remainingPrice / newItemPrice) *
          100
        ).toFixed(2);
      }

      uomsde[index]["itemPrice"] = newItemPrice;
      this.setState({ uomsde });
    }
  };

  handleItemCostChange = (event, item, index) => {
    const newItemCost = Number(event.target.value);
    const newItemPrice = this.state.uomsde[index]["itemPrice"];

    if (newItemCost > 0 && newItemCost < newItemPrice) {
      console.log(newItemCost, "newItemCost price");
      let { uomsde } = this.state;
      uomsde[index]["itemCost"] = newItemCost;
      uomsde[index]["minMargin"] = (
        ((newItemPrice - newItemCost) / newItemPrice) *
        100
      ).toFixed(2);
      this.setState({ uomsde });
    } else {
      window.alert("Cost should be greater than 0 and less than Price...");
    }
  };

  // handlePagination = (e) => {
  //   let { salon, retail } = this.state;
  //   const selectedPage = e.page;
  //   const offset = selectedPage * this.state.per_page;
  //   this.setState(
  //     {
  //       current_page: selectedPage,
  //       pageMeta: { ...this.state.pageMeta, current_page: selectedPage },
  //       offset: offset,
  //     },
  //     () => {
  //       this.updateitemusage(salon, retail);
  //     }
  //   );
  // };

  /* seivice search */
  ListofServiceSearch = async () => {
    await this.props.stockDetails().then((res) => {
      let {
        List,
        Servicefilter,
        pageCount,
        pageMeta,
        count,
        current_page,
        per_page,
      } = this.state;
      Servicefilter = [];
      per_page = 3;
      for (let key of res) {
        if (key.isactive === true && key.division === "Service") {
          Servicefilter.push({
            stockcode: key.stockcode,
            stockname: key.stockname,
            uom: key.uom,
            brand: key.brand,
            linkCode: key.linkCode,
            range: key.range,
            itemNo: key.itemNo,
          });
        }
      }

      List = Servicefilter.slice(
        (current_page - 1) * per_page,
        (current_page - 1) * per_page + per_page
      );
      pageCount = Math.ceil(Servicefilter.length / per_page);
      this.setState({
        List,
        pageCount,
        Servicefilter,
        pageMeta: { ...pageMeta, total_pages: pageCount },
      });
    });
  };
  filterBySearch = ({ target: { value, name } }) => {
    let {
      Servicefilter,
      filtersearch,
      searchone,
      pageCount,
      Filtersearchdata,
    } = this.state;
    if (name == "search") {
      searchone = value;
      this.setState({ searchone });
    }
    if (searchone !== "") {
      Filtersearchdata = Servicefilter.filter((item) => {
        return Object.values(item)
          .join("")
          .toLowerCase()
          .includes(searchone.toLowerCase());
      });
    } else {
      Filtersearchdata = Servicefilter;
    }
    filtersearch = Filtersearchdata.slice(
      this.state.offset,
      this.state.offset + this.state.per_page
    );
    pageCount = Math.ceil(filtersearch.length / this.state.per_page);
    this.setState({ Servicefilter, filtersearch, pageCount });
    {
    }
  };

  addsearch = (stockcode, stockname, itemNo) => {
    let { subtable } = this.state;
    let newvalue = {
      itemSrvcode: stockcode,
      itemSrvdesc: stockname,
      itemSrvIdId: itemNo,
    };
    subtable.push(newvalue);
    this.setState({ subtable });
  };

  handlePagenation = (e) => {
    let { pageMeta } = this.state;
    const selectedPage = e.page;
    const offset = selectedPage * this.state.per_page;
    this.setState(
      {
        current_page: selectedPage,
        pageMeta: { ...this.state.pageMeta, current_page: selectedPage },
        offset: offset,
      },
      () => {
        this.ListofServiceSearch();
      }
    );
  };

  deletesearchitem = (ind) => {
    let { subtable } = this.state;
    subtable = subtable.filter((x, index) => index !== ind);
    this.setState({
      subtable,
    });
  };

  handleEditContent = (item) => {
    this.setState({
      contentDetailOne: item?.contentDetail1,
      contentDetailTwo: item?.contentDetail2,
      contentEditId: item?.id,
      contentLineNo: item?.contentLineNo,
      contentIsActive: item?.isActive,
    });
  };

  render() {
    let {
      subtable,
      seachdata,
      is_component_loading,
      filtersearch,
      stkbalanceDetails,
      LinkcodeDetails,
      StockDetails,
      headerService,
      List,
      prepaidamount,
      flexiPoints,
      prepaidprice,
      validvoucherdate,
      UOMoneDetails,
      account_no,
      isaccode,
      UOMtwoDetails,
      editid,
      editval,
      ItemoneDetails,
      card_noacc,
      prepaidall,
      min_qty,
      serviceExpireMonth,
      treatmentLimitCount,
      Replenishment,
      Remind_advance,
      salescommissiongroup,
      workcommissiongroup,
      work_point,
      sales_point,
      ItemtwoDetails,
      Serviceheader,
      prepaidDetails,
      isopenlinkedit,
      isopenitemedit,
      pageMeta,
      staffList,
      is_loading,
      item_desc,
      prepaid_inclusive,
      prepaid_exclusive,
      prepaidexclusive,
      option,
      count,
      isoption,
      linklist,
      isgeneral,
      uomsde,
      itemClassIdId,
      itemDeptIdId,
      itemDivIdId,
      itemRangeIdId,
      itemTypeIdId,
      isstk,
      islink,
      isstock,
      isvoucher,
      isservice,
      isItemContent,
      prepaidftable,
      packageDetails,
      packagetwoDetails,
      isuom,
      isitem,
      isprepaid,
      stockdivision,
      prepaidinclusive,
      Division,
      prepaidamountone,
      dept,
      brand,
      stockname,
      stocktype,
      istaxcode,
      stockprice,
      floorprice,
      disclimit,
      ItemBarCode,
      stockclass,
      stock_type,
      range,
      description,
      duration,
      membershipPoint,
      range_desc,
      range_brand,
      range_code,
      range_active,
      reoreder_level,
      treatmentLimitActive,
      limitserviceFlexionly,
      serviceExpireActive,
      expirystatus,
      iscommission,
      subitemusage,
      customer_replan,
      priceceiling,
      sitecode,
      uomcode,
      isOpendepartment,
      isOpenbrand,
      isOpenclass,
      itemusage_qty,
      itemusage_des,
      isopenrange,
      itemusage_uom,
      images,
      itemusage_code,
      isOpenuom,
      itemusage,
      isOpenlink,
      vouchervalue,
      validity,
      Uoms,
      sitegroup,
      stocklist,
      rangeoption,
      valid,
      uomprice,
      uomcost,
      taxone,
      taxtwo,
      taxoneop,
      Sales_commission,
      work_commission,
      taxtwoop,
      supply_itemsval,
      uommargin,
      validperiod,
      brandlist,
      supplyitem,
      vouchervalid,
      depts,
      classoption,
      control_no,
      inclusive,
      exclusive,
      Inclusive_type,
      exclusive_type,
      commissionable,
      item_active,
      redeem_item,
      open_prepaid,
      percent,
      allow_foc,
      auto_cust_disc,
      tax,
      start_time,
      from_date,
      to_date,
      Appt_TDT,
      package_dept,
      packagedeptvalue,
      appt,
      package_details,
      to_time,
      package_code,
      package_name,
      package_uom,
      package_price,
      package_qty,
      package_discount,
      content_total,
      disc_amount,
      package_total,
      salon,
      retail,
      package_content,
      disc_method,
      itemlevelactive,
      item_seq,
      filterdata,
      Itemdata,
      search,
      itemusage_barcode,
      itemusage_dept,
      itemusage_div,
      searchone,
      packagePageMeta,
      filterdataone,
      markup_price,
      image,
      contentDetailOne,
      contentDetailTwo,
      contentDetails,
      contentHeader,
      contentEditId,
      vilidityFromDate,
      vilidityToDate,
      package_div,
    } = this.state;
    console.log(seachdata, "subtable searccing value");
    let { t } = this.props;
    return (
      <>
        {is_component_loading ? (
          <div className="d-flex mt-5 align-items-center justify-content-center">
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white">
              <div className="row container">
                <div className="col-md-12 d-flex align-items-center mt-3">
                  <div className="detail d-flex mt-3">
                    <p
                      className="category"
                      onClick={() => this.props.history.push("/admin/backend")}
                    >
                      {t("Master Data")}
                    </p>
                    <i className="icon-right mx-md-3 p-1"></i>
                    <p
                      className="sub-category"
                      onClick={() => this.props.history.push("/admin/backend")}
                    >
                      {t("Item Master")}
                    </p>
                    <i className="icon-right mx-md-3 p-1"></i>
                    <p className="sub-category">{t("Stock Item Data Entry")}</p>
                  </div>
                </div>
              </div>
              <div className="container-fluid dataentry">
                <div
                  className="d-flex  justify-content-between p-3 General"
                  onClick={() => this.generalcontent()}
                >
                  <p>{t("General")}</p>
                  <div className="icon">
                    {isgeneral == false ? (
                      <AiOutlinePlus />
                    ) : (
                      <AiOutlineMinus />
                    )}
                  </div>
                </div>
                {isgeneral == true ? (
                  <div className="container-fluid generalcontent">
                    <div className="row">
                      <div className="col-12 col-md-6 mt-2">
                        <div className="mt-3">
                          <span>{t("Stock Division")}</span>
                          <span className="star">*</span>
                          <div className="input-group">
                            <NormalSelect
                              options={Division}
                              value={stockdivision}
                              onChange={this.temp}
                              name="stockdivision"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <span>{t("Department")}</span>
                          <span className="star">*</span>
                          <div className="d-md-flex col-12 p-0">
                            <div className="input-group col-12 col-md-7 p-0">
                              <NormalSelect
                                options={depts}
                                value={dept}
                                name="dept"
                                onChange={this.temp}
                              />
                            </div>
                            <div className="col-md-5 mt-3 mt-md-0">
                              <NormalButtonBackend
                                mainbg={true}
                                label={"Add New"}
                                onClick={() => this.handleDialog()}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <span>{t("Brand")}</span>
                          <span className="star">*</span>
                          <div className="d-md-flex col-12 p-0">
                            <div className="input-group col-md-7 p-0">
                              <NormalSelect
                                options={brandlist}
                                value={brand}
                                onChange={this.temp}
                                name="brand"
                              />
                            </div>
                            <div className="col-md-5 mt-3 mt-md-0">
                              <NormalButtonBackend
                                mainbg={true}
                                label={"Add New"}
                                onClick={() => this.handlebrandDialog()}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p>{t("Picture")}</p>
                          <div className="mt-3 ml-2">
                            <input
                              type="file"
                              onChange={(event) =>
                                this.handleimageChange(event)
                              }
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <span>{"Stock Name"}</span>
                          <span className="star">*</span>
                          <div className="input-group">
                            <NormalInput
                              onChange={this.temp}
                              value={stockname}
                              name="stockname"
                              placeholder="Enter Stock name"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <span>{t("Stock Type")}</span>
                          <span className="star">*</span>
                          <div className="input-group">
                            <NormalSelect
                              options={stock_type}
                              value={stocktype}
                              onChange={this.temp}
                              name="stocktype"
                            />
                          </div>
                        </div>
                        {stockdivision == 3 ||
                        stockdivision == 4 ||
                        stockdivision == 5 ? (
                          ""
                        ) : (
                          <div className="mt-3">
                            <span>{t("Supplier Code")}</span>
                            <span className="star">*</span>
                            <div className="input-group">
                              <NormalSelect
                                options={supplyitem}
                                value={supply_itemsval}
                                onChange={this.temp}
                                name="supply_itemsval"
                              />
                            </div>
                          </div>
                        )}
                        <div className="mt-3 d-md-flex col-12 p-0">
                          {stockdivision == 1 ||
                          stockdivision == 2 ||
                          stockdivision == 3 ||
                          stockdivision == 4 ||
                          stockdivision == 5 ||
                          stockdivision == null ? (
                            <div className="input-group col-12 col-md-5 col-lg-5 mt-3 mt-md-0 p-0">
                              <p>{t("Price")}</p>
                              <div className="input-group">
                                <NormalInput
                                  onChange={this.temp}
                                  value={stockprice}
                                  name="stockprice"
                                  placeholder="Enter price"
                                />
                              </div>
                            </div>
                          ) : (
                            ""
                          )}
                          {stockdivision == 3 || stockdivision == null ? (
                            <>
                              <div className="input-group col-12 col-md-5 col-lg-6 ml-0 ml-md-5 ml-lg-5 mt-3 mt-md-0 p-0">
                                <p>{t("Floor Price")}</p>
                                <div className="input-group">
                                  <NormalInput
                                    onChange={this.temp}
                                    value={floorprice}
                                    name="floorprice"
                                    placeholder="Enter Floor price"
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            ""
                          )}
                        </div>
                        {stockdivision == 4 || stockdivision == 5 ? (
                          ""
                        ) : (
                          <div className="mt-3 d-md-flex col-12 p-0">
                            <div className="input-group col-12 col-md-5 col-lg-5 mt-3 mt-md-0 p-0">
                              <p>{t("Item Barcode")}</p>
                              <div className="input-group">
                                <NormalInput
                                  onChange={this.temp}
                                  value={ItemBarCode}
                                  name="ItemBarCode"
                                  type="number"
                                  placeholder="Enter Barcode"
                                />
                              </div>
                            </div>
                            <div className="input-group col-12 col-md-5 col-lg-6 ml-0 ml-md-5 ml-lg-5 mt-3 mt-md-0 p-0">
                              <p>{"Discount Limit"}</p>
                              <div className="input-group">
                                <NormalInput
                                  onChange={this.temp}
                                  value={disclimit}
                                  name="disclimit"
                                  type="number"
                                  placeholder="Enter Discount limit"
                                />
                              </div>
                            </div>
                            {/* <div className="mt-3 d-md-flex col-12 p-0">
                        <div className="col-12 p-0">
                          <p>{t("Max. Markup price (%) ")}</p>
                          <div className="input-group">
                            <NormalInput
                              onChange={this.temp}
                              value={markup_price}
                              name="markup_price"
                              placeholder="Enter percentage"
                            />
                          </div>
                        </div>
                      </div> */}
                          </div>
                        )}
                        {stocktype == "PACKAGE" ? (
                          ""
                        ) : (
                          <div className="mt-3 d-md-flex col-12 p-0">
                            <div className="input-group col-12 col-md-5 col-lg-5 mt-3 mt-md-0 p-0">
                              <p>{t("From Date")}</p>
                              <div className="input-group">
                                <NormalDate
                                  value={vilidityFromDate}
                                  name="vilidityFromDate"
                                  onChange={this.package}
                                />
                              </div>
                            </div>
                            <div className="input-group col-12 col-md-5 col-lg-6 ml-0 ml-md-5 ml-lg-5 mt-3 mt-md-0 p-0">
                              <p>{"To Date"}</p>
                              <div className="input-group">
                                <NormalDate
                                  value={vilidityToDate}
                                  name="vilidityToDate"
                                  onChange={this.package}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="col-12 col-md-6">
                        <div className="col-12 mt-4 mt-md-5 p-0">
                          <div className="input-group">
                            <NormalInput
                              value={control_no}
                              name="control"
                              onChange={this.temp}
                              disabled={true}
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <span>{t("Class")}</span>
                          <span className="star">*</span>
                          <div className="d-md-flex">
                            <div className="input-group">
                              <NormalSelect
                                options={classoption}
                                value={stockclass}
                                onChange={this.temp}
                                name="stockclass"
                              />
                            </div>
                            <div className="col-md-5 mt-3 mt-md-0">
                              <NormalButtonBackend
                                mainbg={true}
                                label={"Add New"}
                                onClick={() => this.handleclassDialog()}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 ">
                          <span>{t("Range")}</span>
                          <span className="star">*</span>
                          <div className="d-md-flex">
                            <div className="input-group">
                              <NormalSelect
                                options={rangeoption}
                                value={range}
                                onChange={this.temp}
                                name="range"
                              />
                            </div>
                            <div className="col-md-5 mt-3 mt-md-0">
                              <NormalButtonBackend
                                mainbg={true}
                                label={"Add New"}
                                onClick={() => this.handlerangeDialog()}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 imagecontainer d-flex justify-content-center justify-content-md-start">
                          <img src={image} alt="" width="100" height="66" />
                        </div>
                        <div className="mt-4">
                          <span>{t("Description")}</span>
                          <span className="star">*</span>
                          <div className="input-group">
                            <NormalInput
                              onChange={this.temp}
                              value={item_desc}
                              name="item_desc"
                              placeholder="Enter Description"
                            />
                          </div>
                        </div>
                        {/* {stockdivision == 3 ||
                  stockdivision == 4 ||
                  stockdivision == 5 ? ( */}
                        <div className="mt-3">
                          <span>{t("Duration (Minutes)")}</span>
                          <div className="input-group">
                            <NormalInput
                              value={duration}
                              onChange={this.temp}
                              name="duration"
                              placeholder="Enter Duration"
                            />
                          </div>
                        </div>
                        {/* ) : null} */}
                        {stockdivision == 1 ||
                        stockdivision == 2 ||
                        stockdivision == 3 ||
                        stockdivision == null ? (
                          <div className="mt-3">
                            <span>{t("Membership Point Redeem")}</span>
                            <div className="input-group">
                              <NormalInput
                                value={membershipPoint}
                                onChange={this.temp}
                                name="membershipPoint"
                                type="number"
                                placeholder="Enter Membership Point Redeem"
                              />
                            </div>
                          </div>
                        ) : null}
                        {stockdivision == 3 || stockdivision == null ? (
                          <div className="d-md-flex mt-3 col-12 p-0">
                            <div className="input-group col-12 col-md-6 p-0">
                              <p>{t("Cost")}</p>
                              <div className="input-group">
                                <NormalInput
                                  onChange={this.temp}
                                  value={priceceiling}
                                  name="cost"
                                  placeholder="Enter cost"
                                />
                              </div>
                            </div>
                            <div className="col-12 col-md-6 mt-3 mt-md-0 p-0 px-md-0">
                              <p>{t("Check")}</p>
                              <div className="d-flex mt-2 mx-3">
                                <NormalCheckbox />
                                <p>{t("Percent")}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          ""
                        )}
                        {stockdivision == 4 || stockdivision == 5 ? (
                          ""
                        ) : (
                          <div className="mt-2">
                            <span>{t("Check")}</span>
                            <div className="d-md-flex col-12 p-0">
                              <div className="col-12 col-md-6">
                                <div className="d-flex mt-2 mt-md-0 mt-lg-0">
                                  <NormalCheckbox
                                    checked={percent}
                                    name="percent"
                                    onChange={this.handlecheckbox}
                                  />
                                  <p>{t("Percent")}</p>
                                </div>
                              </div>
                              <div className="col-12 col-md-6">
                                <div className="d-flex">
                                  <NormalCheckbox
                                    checked={auto_cust_disc}
                                    name="auto_cust_disc"
                                    onChange={this.handlecheckbox}
                                  />
                                  <p>{t("Auto Cust Disc")}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {stockdivision == 5 ? (
                          <div className="mt-3 mt-md-5">
                            <span>{t("Check")}</span>
                            <div className="d-md-flex col-12 p-0">
                              <div className="col-12 col-md-6 d-flex">
                                <div className="d-flex">
                                  <NormalCheckbox
                                    checked={open_prepaid}
                                    name="open_prepaid"
                                    onChange={this.handlecheckbox}
                                  />
                                  <p>{t("Open Prepaid")}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          ""
                        )}
                        <div className="mt-2 mt-md-3 d-md-flex">
                          <div className="col-12 col-md-6 d-flex">
                            <NormalCheckbox
                              checked={tax}
                              name="tax"
                              onChange={this.handlecheckbox}
                            />
                            <p>{t("Tax")}</p>
                          </div>
                          <div className="col-12 col-md-6 d-flex">
                            <NormalCheckbox
                              checked={allow_foc}
                              name="allow_foc"
                              onChange={this.handlecheckbox}
                            />
                            <p>{t("Item allow FOC")}</p>
                          </div>
                        </div>
                        {/* <div className="mt-3">
                    <span>{t("Display Sequence")}</span>
                    <div className="input-group">
                      <NormalInput
                        onChange={this.temp}
                        value={item_seq}
                        name="item_seq"
                        type="number"
                      />
                    </div>
                  </div> */}
                      </div>
                      <div className="mt-3 d-md-flex col-6">
                        <div className="col-md-3 col-6 d-flex p-0">
                          <NormalCheckbox
                            checked={item_active}
                            name="item_active"
                            onChange={this.handlecheckbox}
                          />
                          <p>{t("Active")}</p>
                        </div>
                        <div className="col-12 col-md-6 d-flex p-0">
                          <NormalCheckbox
                            checked={commissionable}
                            name="commissionable"
                            onChange={this.handlecheckbox}
                          />
                          <p>{t("Commissionable")}</p>
                        </div>
                        <div className="col-12 col-md-3 d-flex p-0">
                          <NormalCheckbox
                            checked={redeem_item}
                            name="redeem_item"
                            onChange={this.handlecheckbox}
                          />
                          <p>{t("Redeem Item")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  ""
                )}

                {commissionable == true ? (
                  <div>
                    <div
                      className="d-flex  justify-content-between p-3 General mt-5"
                      onClick={() => this.commissioncontent()}
                    >
                      <p>{t("commission")}</p>
                      <div className="icon">
                        {iscommission == false ? (
                          <AiOutlinePlus />
                        ) : (
                          <AiOutlineMinus />
                        )}
                      </div>
                    </div>
                    {iscommission == true ? (
                      <div className="container-fluid ">
                        <div className="row">
                          <div className="col-12 col-md-6 col-lg-6">
                            <div className="mt-3">
                              <span>{t("Sales Commission Group")}</span>
                              <span style={{ color: "red" }}>*</span>
                              <div className="input-group">
                                <NormalSelect
                                  options={salescommissiongroup}
                                  value={Sales_commission}
                                  onChange={this.sublist}
                                  name="Sales_commission"
                                />
                              </div>
                            </div>
                            <div className="mt-3">
                              <span>{t("Work Commission Group")}</span>
                              <span style={{ color: "red" }}>*</span>
                              <div className="input-group">
                                <NormalSelect
                                  options={workcommissiongroup}
                                  value={work_commission}
                                  onChange={this.sublist}
                                  name="work_commission"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="col-12 col-md-6 col-lg-6">
                            <div className="mt-3">
                              <span>{t("Sales Points")}</span>
                              <span style={{ color: "red" }}>*</span>
                              <div className="d-flex">
                                <div className="input-group">
                                  <NormalInput
                                    value={sales_point}
                                    onChange={this.sublist}
                                    name="sales_point"
                                    placeholder="Enter Sales point"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="mt-3">
                              <span>{t("Work Points")}</span>
                              <span style={{ color: "red" }}>*</span>
                              <div className="d-flex">
                                <div className="input-group">
                                  <NormalInput
                                    value={work_point}
                                    onChange={this.sublist}
                                    name="work_point"
                                    placeholder="Enter work point"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                ) : (
                  ""
                )}

                {stocktype == "PACKAGE" ? (
                  <div>
                    <div
                      className="d-flex  justify-content-between p-3 General mt-5"
                      onClick={() => this.commissioncontent()}
                    >
                      <p>{t("PACKAGE")}</p>
                      <div className="icon">
                        {iscommission == false ? (
                          <AiOutlinePlus />
                        ) : (
                          <AiOutlineMinus />
                        )}
                      </div>
                    </div>
                    {iscommission == true ? (
                      <div className="container-fluid ">
                        <div className="row">
                          <div className="col-12 col-md-8 col-lg-8">
                            <div className="d-md-flex">
                              <div className="mt-3 col-12 col-md-6 col-lg-6">
                                <span>{t("From Date")}</span>
                                <div className="input-group">
                                  <NormalDate
                                    value={from_date}
                                    name="from_date"
                                    onChange={this.package}
                                  />
                                </div>
                              </div>
                              <div className="mt-3 col-12 col-md-6 col-lg-6">
                                <span>{t("To Date")}</span>
                                <div className="input-group">
                                  <NormalDate
                                    value={to_date}
                                    name="to_date"
                                    onChange={this.package}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="d-md-flex ">
                              <div className="mt-3 col-12 col-md-6 col-lg-6">
                                <span>{t("From Time")}</span>
                                <div className="input-group">
                                  <NormalTimePicker
                                    className={`cursor-pointer`}
                                    onChange={this.fromtimechange}
                                    name="start_time"
                                    timeOnly={true}
                                    dateFormat={`HH:mm`}
                                    showTime={true}
                                    selected={false}
                                    placeholder=""
                                    timeIntervals={15}
                                    value={start_time}
                                    showIcon={false}
                                  />
                                </div>
                              </div>
                              <div className="mt-3 col-12 col-md-6 col-lg-6">
                                <span>{t("To Time")}</span>
                                <div className="input-group">
                                  <NormalTimePicker
                                    className={`cursor-pointer`}
                                    onChange={this.totimechange}
                                    name="to_time"
                                    timeOnly={true}
                                    dateFormat={`HH:mm`}
                                    showTime={true}
                                    selected={false}
                                    placeholder=""
                                    timeIntervals={15}
                                    value={to_time}
                                    showIcon={false}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="d-md-flex">
                              <div className="d-flex mt-3 col-12 col-md-6 col-lg-6">
                                <NormalCheckbox
                                  checked={Appt_TDT}
                                  name="Appt_TDT"
                                  onChange={this.package}
                                />
                                <span style={{ color: "red" }}>
                                  {t("Appt TDT")}
                                </span>
                              </div>

                              <div className="mt-3 col-12 col-md-6 col-lg-6">
                                <span style={{ color: "red" }}>
                                  {t("min. select for Appt:")}
                                </span>
                                <div className="input-group">
                                  <NormalInput
                                    value={appt}
                                    disabled={Appt_TDT == true ? false : true}
                                    name="appt"
                                    onChange={this.package}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-12 col-md-4 col-lg-4 mt-3">
                            <div>
                              <span>{t("2. Discount Method")}</span>
                              <div
                                className="mt-3 "
                                onChange={(event) => this.packageradio(event)}
                              >
                                <div>
                                  <input
                                    type="radio"
                                    value="Evenly Average"
                                    name="method"
                                    defaultChecked
                                    className="mt-1 ml-3"
                                  />
                                  Evenly Average
                                </div>
                                <div className="mt-2">
                                  <input
                                    type="radio"
                                    value="Manual"
                                    name="method"
                                    className="mt-1 ml-3"
                                  />
                                  Manual
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 d-flex">
                          <div className="col-12 col-md-8 col-lg-8">
                            <span>{t("Package Item Department")}</span>
                            <NormalSelect
                              options={package_dept}
                              value={packagedeptvalue}
                              onChange={this.package}
                              name="packagedeptvalue"
                            />
                          </div>
                          <div className="col-12 col-md-3 col-lg-3 mt-4">
                            <NormalButtonBackend
                              mainbg={true}
                              label="Searchitems"
                              onClick={this.filterBydept}
                            />
                          </div>
                        </div>

                        <div className="col-12 mt-3  package">
                          <div className="row d-flex justify-content-end">
                            <div className="mt-3 col-12 col-md-4 col-lg-4">
                              <InputSearch
                                placeholder={t("Search")}
                                onChange={this.filterByPackageName}
                              />
                            </div>
                          </div>
                          {console.log(
                            this.state.seachpackagedata,
                            "seachpackagedata for package"
                          )}
                          {searchone.length > 1 ? (
                            <div className="tab-table-content">
                              <div className="py-4">
                                <div className="table-container">
                                  <NormalTable
                                    headerDetails={packageDetails}
                                    pageMeta={packagePageMeta}
                                    queryHandler={(event) =>
                                      this.handlePackagePage(event)
                                    }
                                  >
                                    {is_loading ? (
                                      <tr>
                                        <td colSpan="7">
                                          <div class="d-flex mt-5 align-items-center justify-content-center">
                                            <div
                                              class="spinner-border"
                                              role="status"
                                            >
                                              <span class="sr-only">
                                                Loading...
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : this.state.seachpackagedata.length >
                                      0 ? (
                                      this.state.seachpackagedata.map(
                                        (
                                          {
                                            stockName,
                                            division,
                                            department,
                                            brand,
                                            range,
                                            itemUom,
                                            uomUnit,
                                            item_Price,
                                            stockCode,
                                            quantity,
                                          },
                                          index
                                        ) => {
                                          return (
                                            <tr>
                                              <td className="position-relative status-type">
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {stockCode}
                                                </div>
                                              </td>
                                              <td className="position-relative status-type">
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {stockName}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {division}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {department}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {brand}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {range}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {itemUom}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {uomUnit}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {item_Price}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start cursor-pointer">
                                                  <FaRegHandPointUp
                                                    size={20}
                                                    color="blue"
                                                    onClick={() =>
                                                      this.addpackage(
                                                        stockCode,
                                                        stockName,
                                                        itemUom,
                                                        item_Price,
                                                        quantity,
                                                        division
                                                      )
                                                    }
                                                  />
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        }
                                      )
                                    ) : null}
                                  </NormalTable>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="tab-table-content">
                              <div className="py-4">
                                <div className="table-container">
                                  <NormalTable
                                    headerDetails={packageDetails}
                                    pageMeta={packagePageMeta}
                                    queryHandler={(event) =>
                                      this.handlePackagePage(event)
                                    }
                                  >
                                    {is_loading ? (
                                      <tr>
                                        <td colSpan="7">
                                          <div class="d-flex mt-5 align-items-center justify-content-center">
                                            <div
                                              class="spinner-border"
                                              role="status"
                                            >
                                              <span class="sr-only">
                                                Loading...
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : this.state.Itempackagedata.length >
                                      0 ? (
                                      this.state.Itempackagedata.map(
                                        (
                                          {
                                            stockName,
                                            division,
                                            department,
                                            brand,
                                            range,
                                            itemUom,
                                            uomUnit,
                                            item_Price,
                                            stockCode,
                                            quantity,
                                          },
                                          index
                                        ) => {
                                          return (
                                            <tr>
                                              <td className="position-relative status-type">
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {stockCode}
                                                </div>
                                              </td>
                                              <td className="position-relative status-type">
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {stockName}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {division}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {department}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {brand}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {range}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {itemUom}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {uomUnit}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {item_Price}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start cursor-pointer">
                                                  <FaRegHandPointUp
                                                    size={20}
                                                    color="blue"
                                                    onClick={() =>
                                                      this.addpackage(
                                                        stockCode,
                                                        stockName,
                                                        itemUom,
                                                        item_Price,
                                                        quantity,
                                                        division
                                                      )
                                                    }
                                                  />
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        }
                                      )
                                    ) : null}
                                  </NormalTable>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="d-md-flex mt-3">
                          <div className="mt-3 col-12 col-md-3 col-lg-3">
                            <span>{t("Code")}</span>
                            <NormalInput
                              value={package_code}
                              name="package_code"
                              onChange={this.package}
                              disabled={true}
                            />
                          </div>
                          <div className="mt-3 col-12 col-md-6 col-lg-6">
                            <span>{t("Name")}</span>
                            <NormalInput
                              value={package_name}
                              name="package_name"
                              onChange={this.package}
                              disabled={true}
                            />
                          </div>
                          <div className="mt-3 col-12 col-md-3 col-lg-3">
                            <span>{t("UOM")}</span>
                            <NormalInput
                              value={package_uom}
                              name="package_uom"
                              onChange={this.package}
                              disabled={true}
                            />
                          </div>
                        </div>

                        <div className="d-md-flex">
                          <div className="mt-3 col-12 col-md-3 col-lg-3">
                            <span>{t("Price")}</span>
                            <NormalInput
                              value={package_price}
                              name="package_price"
                              onChange={this.package}
                              placeholder="Enter price"
                              type="number"
                            />
                          </div>
                          <div className="mt-3 col-12 col-md-3 col-lg-3">
                            <span>{t("Qty")}</span>
                            <NormalInput
                              value={package_qty}
                              name="package_qty"
                              onChange={this.package}
                              placeholder="Enter Qty"
                              type="number"
                            />
                          </div>
                          <div className="mt-3 col-12 col-md-2 col-lg-2">
                            <span>{t("Discount")}</span>
                            <NormalInput
                              value={package_discount}
                              name="package_discount"
                              onChange={this.package}
                              placeholder="Enter Discount"
                              type="number"
                            />
                          </div>
                          <div className="mt-3 col-12 col-md-3 col-lg-3">
                            <div className="mt-0 mt-md-4 mt-lg-4">
                              <NormalButtonBackend
                                mainbg={true}
                                label="Insert/update"
                                onClick={() =>
                                  this.insertpackage(
                                    package_code,
                                    package_uom,
                                    package_qty,
                                    package_name,
                                    package_price,
                                    package_discount,
                                    package_div
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <span>{t("4. Package Content")}</span>
                        </div>
                        <div className="col-12">
                          <div className="tab-table-content">
                            <div className="py-4">
                              <div className="table-container">
                                <NormalTable headerDetails={packagetwoDetails}>
                                  {is_loading ? (
                                    <tr>
                                      <td colSpan="7">
                                        <div class="d-flex mt-5 align-items-center justify-content-center">
                                          <div
                                            class="spinner-border"
                                            role="status"
                                          >
                                            <span class="sr-only">
                                              Loading...
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : package_content.length > 0 ? (
                                    package_content.map(
                                      (
                                        {
                                          Item_Code,
                                          Description,
                                          Qty,
                                          U_Price,
                                          Total,
                                          Unit_Disc,
                                          P_Price,
                                          Total_Amount,
                                          UOM,
                                          Active,
                                        },
                                        index
                                      ) => {
                                        return (
                                          <tr>
                                            <td className="position-relative status-type">
                                              <div className="d-flex align-items-center justify-content-start">
                                                {Item_Code}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="d-flex align-items-center justify-content-start">
                                                {Description}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="d-flex align-items-center justify-content-start">
                                                {Qty}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="d-flex align-items-center justify-content-start">
                                                {U_Price}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="d-flex align-items-center justify-content-start">
                                                {Total}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="d-flex align-items-center justify-content-start">
                                                {Unit_Disc}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="d-flex align-items-center justify-content-start">
                                                {P_Price}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="d-flex align-items-center justify-content-start">
                                                {Total_Amount}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="d-flex align-items-center justify-content-start">
                                                {UOM}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="d-flex align-items-center justify-content-start">
                                                {Active}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="d-flex align-items-center justify-content-center cursor-pointer">
                                                <BiPencil
                                                  size={20}
                                                  onClick={() =>
                                                    this.selectcode(Item_Code)
                                                  }
                                                />
                                              </div>
                                            </td>
                                            <td>
                                              <div className="d-flex align-items-center justify-content-center cursor-pointer">
                                                <RiDeleteBin5Line
                                                  size={20}
                                                  onClick={() =>
                                                    this.deletepackage(
                                                      Item_Code
                                                    )
                                                  }
                                                />
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      }
                                    )
                                  ) : null}
                                </NormalTable>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="d-md-flex">
                          <div className="mt-3 col-12 col-md-3 col-lg-3 d-md-flex">
                            <span>{t("Content Total")}</span>
                            <NormalInput
                              value={content_total}
                              name="content_total"
                              onChange={this.package}
                              disabled={true}
                            />
                          </div>
                          {disc_method !== "Manual" ? (
                            <div className="mt-3 col-12 col-md-6 col-lg-6 d-md-flex">
                              <span>{t("Disc Amount")}</span>
                              <NormalInput
                                value={disc_amount}
                                name="disc_amount"
                                onChange={this.package}
                                type="number"
                              />
                              <div className="col-12 col-md-5 col-lg-5 mt-4 mt-md-0 mt-lg-0">
                                <NormalButtonBackend
                                  mainbg={true}
                                  label="Apply Discount"
                                  onClick={() =>
                                    this.applydiscount(disc_amount)
                                  }
                                />
                              </div>
                            </div>
                          ) : null}
                          <div className="col-12 col-md-3 col-lg-3 mt-4 mt-md-0 mt-lg-0">
                            <span>{t("Total Price")}</span>
                            <NormalInput
                              value={package_total}
                              name="package_total"
                              onChange={this.package}
                              type="number"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                ) : (
                  ""
                )}

                {stockdivision == "1" ||
                stockdivision == "2" ||
                stockdivision == null ? (
                  <div>
                    <div
                      className="d-flex  justify-content-between p-3 General mt-5"
                      onClick={() => this.UOMcontent()}
                    >
                      <p>{t("UOM")}</p>
                      <div className="icon">
                        {isuom == false ? (
                          <AiOutlinePlus />
                        ) : (
                          <AiOutlineMinus />
                        )}
                      </div>
                    </div>
                    {isuom == true ? (
                      <div>
                        <div className="col-12 mt-3">
                          <div className="tab-table-content">
                            <div className="py-4">
                              <div className="table-container">
                                <NormalTable headerDetails={UOMoneDetails}>
                                  {is_loading ? (
                                    <tr>
                                      <td colSpan="7">
                                        <div class="d-flex mt-5 align-items-center justify-content-center">
                                          <div
                                            class="spinner-border"
                                            role="status"
                                          >
                                            <span class="sr-only">
                                              Loading...
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : uomsde.length > 0 ? (
                                    uomsde.map(
                                      (
                                        {
                                          id,
                                          itemUom,
                                          uomDesc,
                                          uomUnit,
                                          itemUom2,
                                          uom2Desc,
                                        },
                                        index
                                      ) => {
                                        return (
                                          <tr>
                                            <td>
                                              <div className="text-left">
                                                {index + 1}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                {itemUom}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                {uomDesc}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                {"="}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                {uomUnit}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                {itemUom2}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                {uom2Desc}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left cursor-pointer">
                                                <RiDeleteBin5Line
                                                  size={20}
                                                  onClick={() =>
                                                    this.deleteuom(id)
                                                  }
                                                />
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      }
                                    )
                                  ) : null}
                                </NormalTable>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <NormalButtonBackend
                            mainbg={true}
                            label={"Add Row"}
                            onClick={() => this.handleuomDialog()}
                          />
                        </div>
                        <div className="col-12 mt-3">
                          <div className="tab-table-content">
                            <div className="py-4">
                              <div className="table-container">
                                <NormalTable headerDetails={UOMtwoDetails}>
                                  {is_loading ? (
                                    <tr>
                                      <td colSpan="7">
                                        <div class="d-flex mt-5 align-items-center justify-content-center">
                                          <div
                                            class="spinner-border"
                                            role="status"
                                          >
                                            <span class="sr-only">
                                              Loading...
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : uomsde.length > 0 ? (
                                    uomsde.map((x, index) => {
                                      return (
                                        <tr>
                                          <td>
                                            <div className="text-left">
                                              {index + 1}
                                            </div>
                                          </td>
                                          <td>
                                            <div className="text-left">
                                              {x.itemUom}
                                            </div>
                                          </td>
                                          <td>
                                            <div className="d-flex align-items-center justify-content-center">
                                              <div className="input-group">
                                                <input
                                                  style={{
                                                    width: "150px",
                                                    textAlign: "right",
                                                  }}
                                                  value={
                                                    x.itemPrice !== 0
                                                      ? x.itemPrice
                                                      : ""
                                                  }
                                                  name="itemPrice"
                                                  onChange={(event) =>
                                                    this.handleItemPriceChange(
                                                      event,
                                                      x,
                                                      index
                                                    )
                                                  }
                                                  type={`number`}
                                                  placeholder="Enter Price"
                                                />
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div className="d-flex align-items-center justify-content-center">
                                              <div className="input-group">
                                                <input
                                                  style={{
                                                    width: "150px",
                                                    textAlign: "right",
                                                  }}
                                                  value={
                                                    x.itemCost !== 0
                                                      ? x.itemCost
                                                      : ""
                                                  }
                                                  name="itemCost"
                                                  onChange={(event) =>
                                                    this.handleItemCostChange(
                                                      event,
                                                      x,
                                                      index
                                                    )
                                                  }
                                                  type={`number`}
                                                  placeholder="Enter Cost"
                                                />
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            <div className="d-flex align-items-center justify-content-center">
                                              <div className="input-group">
                                                <input
                                                  style={{
                                                    width: "150px",
                                                    textAlign: "right",
                                                  }}
                                                  value={
                                                    x.minMargin !== 0
                                                      ? x.minMargin
                                                      : ""
                                                  }
                                                  name="minMargin"
                                                  onChange={(event) =>
                                                    this.handleMinMarginChange(
                                                      event,
                                                      x,
                                                      index
                                                    )
                                                  }
                                                  type={`number`}
                                                  placeholder="Enter minMargin"
                                                />
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : null}
                                </NormalTable>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                ) : (
                  ""
                )}
                {stockdivision == "1" ||
                stockdivision == "2" ||
                stockdivision == null ? (
                  <div>
                    <div
                      className="d-flex  justify-content-between p-3 General mt-5"
                      onClick={() => this.stkbalancecontent()}
                    >
                      <p>{t("Stk.Balance")}</p>
                      <div className="icon">
                        {isstk == false ? (
                          <AiOutlinePlus />
                        ) : (
                          <AiOutlineMinus />
                        )}
                      </div>
                    </div>
                    {isstk == true ? (
                      <div className="row">
                        <div className="col-12 col-md-6 col-lg-6">
                          <p className="mt-3 text-black common-label-text">
                            {t("Site Code")}
                          </p>
                          <div className="input-group">
                            <NormalSelect
                              options={sitegroup}
                              value={sitecode}
                              onChange={this.handlechangestk}
                              name="sitecode"
                            />
                          </div>
                          <p className="mt-3 text-black common-label-text">
                            {t("UOM Code")}
                          </p>
                          <div className="d-md-flex d-lg-flex mt-1">
                            <div className="input-group">
                              <NormalSelect
                                options={Uoms}
                                value={uomcode}
                                onChange={this.handlechangestk}
                                name="uomcode"
                              />
                            </div>
                            <div className="ml-0 ml-md-5 ml-lg-5 mt-4 mt-md-0 mt-lg-0">
                              <NormalButtonBackend
                                mainbg={true}
                                label={"Refresh"}
                              />
                            </div>
                          </div>
                          <div className="col-12 mt-3">
                            <div className="tab-table-content">
                              <div className="py-4">
                                <div className="table-container">
                                  <NormalTable
                                    headerDetails={stkbalanceDetails}
                                    // queryHandler={this.handlePagination}
                                    // pageMeta={pageMeta}
                                  >
                                    {is_loading ? (
                                      <tr>
                                        <td colSpan="7">
                                          <div class="d-flex mt-5 align-items-center justify-content-center">
                                            <div
                                              class="spinner-border"
                                              role="status"
                                            >
                                              <span class="sr-only">
                                                Loading...
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : staffList.length > 0 ? (
                                      staffList.map(
                                        (
                                          {
                                            id,
                                            emp_name,
                                            emp_phone1,
                                            emp_code,
                                            services,
                                            site_code,
                                            defaultsitecode,
                                            status,
                                          },
                                          index
                                        ) => {
                                          return (
                                            <tr key={index}>
                                              <td className="position-relative status-type">
                                                <span
                                                  className={`${
                                                    status === "available"
                                                      ? "available"
                                                      : "not-available"
                                                  }`}
                                                ></span>
                                                <div className="d-flex align-items-center justify-content-center">
                                                  {emp_name}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-center">
                                                  {emp_phone1}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        }
                                      )
                                    ) : null}
                                  </NormalTable>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-12 col-md-6 col-lg-6 mt-2 mt-md-4 mt-lg-4">
                          <div className="mt-3 ml-md-0 ml-lg-0 d-flex justify-content-between">
                            <div className="d-flex">
                              <NormalCheckbox
                                checked={reoreder_level}
                                name="reoreder_level"
                                onChange={this.handlechangestk}
                              />
                              <p>{t("Re-Order Level")}</p>
                            </div>
                            {reoreder_level == true ? (
                              <div className="d-flex">
                                <p className="mr-3">{t("Min_Qty")}</p>
                                <NormalInput
                                  value={min_qty}
                                  name="min_qty"
                                  type="number"
                                  onChange={this.handlestk}
                                />
                              </div>
                            ) : null}
                          </div>
                          <div className="col-12 mt-2 mt-md-5 mt-lg-5 d-flex">
                            <NormalCheckbox
                              checked={customer_replan}
                              name="customer_replan"
                              onChange={this.handlechangestk}
                            />
                            <p>{t("Customer Replenishment")}</p>
                          </div>
                          {customer_replan == true ? (
                            <>
                              <div className="col-8 mt-5 d-flex ">
                                <p className="mr-3 col-4">
                                  {t("Replenishment")}
                                </p>
                                <NormalInput
                                  value={Replenishment}
                                  name="Replenishment"
                                  type="number"
                                  onChange={this.handlestk}
                                />
                                <p className="ml-3">{t("Days")}</p>
                              </div>
                              <div className="col-8 mt-5 d-flex ">
                                <p className="mr-3 col-4">
                                  {t("Remind_advance")}
                                </p>
                                <NormalInput
                                  value={Remind_advance}
                                  name="Remind_advance"
                                  type="number"
                                  onChange={this.handlestk}
                                />
                                <p className="ml-3">{t("Days")}</p>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                ) : null}
                {stockdivision == "5" ? (
                  ""
                ) : (
                  <div>
                    <div
                      className="d-flex  justify-content-between p-3 General mt-5"
                      onClick={() => this.Linkcontent()}
                    >
                      <p>{t("Link code")}</p>
                      <div className="icon">
                        {islink == false ? (
                          <AiOutlinePlus />
                        ) : (
                          <AiOutlineMinus />
                        )}
                      </div>
                    </div>
                    {islink == true ? (
                      <div>
                        <div className="col-12 mt-3">
                          <div className="tab-table-content">
                            <div className="py-4">
                              <div className="table-container">
                                <NormalTable headerDetails={LinkcodeDetails}>
                                  {is_loading ? (
                                    <tr>
                                      <td colSpan="7">
                                        <div class="d-flex mt-5 align-items-center justify-content-center">
                                          <div
                                            class="spinner-border"
                                            role="status"
                                          >
                                            <span class="sr-only">
                                              Loading...
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : linklist.length > 0 ? (
                                    linklist.map(
                                      (
                                        { linkCode, linkDesc, rptCodeStatus },
                                        index
                                      ) => {
                                        return (
                                          <tr key={index}>
                                            <td>
                                              <div className="text-left">
                                                {linkCode}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                {linkDesc}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left backend-check">
                                                <NormalCheckbox
                                                  checked={rptCodeStatus}
                                                  onChange={(e) =>
                                                    this.handleCheckboxtwo(
                                                      linkCode
                                                    )
                                                  }
                                                />
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                <BsPencilSquare
                                                  size={20}
                                                  onClick={() =>
                                                    this.changelink(
                                                      linkCode,
                                                      linkDesc,
                                                      linklist.length
                                                    )
                                                  }
                                                />
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      }
                                    )
                                  ) : null}
                                </NormalTable>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-12 col-md-3">
                          <NormalButtonBackend
                            mainbg={true}
                            label={"Add Row"}
                            onClick={() => this.handlelinkDialog()}
                          />
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                )}
                <div
                  className="d-flex  justify-content-between p-3 General mt-5"
                  onClick={() => this.stockcontent()}
                >
                  <p>{t("Stock Listing")}</p>
                  <div className="icon">
                    {isstock == false ? <AiOutlinePlus /> : <AiOutlineMinus />}
                  </div>
                </div>
                {isstock == true ? (
                  <div>
                    <div className="col-12 mt-3">
                      <div className="tab-table-content">
                        <div className="py-4">
                          <div className="table-container">
                            <NormalTable headerDetails={StockDetails}>
                              {is_loading ? (
                                <tr>
                                  <td colSpan="7">
                                    <div class="d-flex mt-5 align-items-center justify-content-center">
                                      <div class="spinner-border" role="status">
                                        <span class="sr-only">Loading...</span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : stocklist.length > 0 ? (
                                stocklist.map(
                                  (
                                    {
                                      itemsiteCode,
                                      itemsiteDesc,
                                      itemsiteIsactive,
                                    },
                                    index
                                  ) => {
                                    return (
                                      <tr key={index}>
                                        <td>
                                          <div className="text-left">
                                            {itemsiteCode}
                                          </div>
                                        </td>
                                        <td>
                                          <div className="text-left">
                                            {itemsiteDesc}
                                          </div>
                                        </td>
                                        <td>
                                          <div className="text-left backend-check">
                                            <NormalCheckbox
                                              checked={itemsiteIsactive}
                                              onChange={(e) =>
                                                this.handleCheckboxone(
                                                  itemsiteCode
                                                )
                                              }
                                            />
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  }
                                )
                              ) : null}
                            </NormalTable>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  ""
                )}
                {stockdivision == "3" || stockdivision == null ? (
                  <div>
                    <div
                      className="d-flex  justify-content-between p-3 General mt-5"
                      onClick={() => this.Itemusagecontent()}
                    >
                      <p>{t("Item Usage")}</p>
                      <div className="icon">
                        {isitem == false ? (
                          <AiOutlinePlus />
                        ) : (
                          <AiOutlineMinus />
                        )}
                      </div>
                    </div>
                    {isitem == true ? (
                      <div>
                        <div className="container-fluid mt-3">
                          <div className="itemmaster-container">
                            <div className="align-items-center">
                              <div className="mt-3 col-12 d-md-flex justify-content-md-between m-0 p-0">
                                <div className="d-flex justify-content-center justify-content-md-start col-12 col-md-8 col-lg-8 mt-3">
                                  <p className="mt-2 mr-1">{t("Show")}</p>
                                  <div className="p-1">
                                    <NormalSelect
                                      options={option}
                                      value={count}
                                      onChange={this.pagination}
                                      name="count"
                                    />
                                  </div>
                                  <p className="mt-2 ml-1">{t("Entries")}</p>
                                </div>
                                <div className="mt-3 col-12 col-md-4 col-lg-4">
                                  <InputSearch
                                    placeholder={t("Search")}
                                    onChange={this.filterByName}
                                    type="search"
                                  />
                                </div>
                              </div>
                              <div className="d-md-flex col-12 p-0 mt-3">
                                <div className="col-12 col-md-3 col-lg-3">
                                  <div className="d-flex">
                                    <NormalCheckbox
                                      checked={salon}
                                      name="salon"
                                      onChange={this.itemusagestock}
                                    />
                                    <p>{t("Show Salon")}</p>
                                  </div>
                                </div>
                                <div className="col-12 col-md-3 col-lg-3">
                                  <div className="d-flex">
                                    <NormalCheckbox
                                      checked={retail}
                                      name="retail"
                                      onChange={this.itemusagestock}
                                    />
                                    <p>{t("Show Retail")}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {search.length > 1 ? (
                              <div className="tab-table-content">
                                <div className="py-4">
                                  <div className="table-container">
                                    <NormalTable
                                      headerDetails={ItemoneDetails}
                                      queryHandler={(event) =>
                                        this.handleItemPageClick(event)
                                      }
                                      pageMeta={pageMeta}
                                    >
                                      {is_loading ? (
                                        <tr>
                                          <td colSpan="7">
                                            <div class="d-flex mt-5 align-items-center justify-content-center">
                                              <div
                                                class="spinner-border"
                                                role="status"
                                              >
                                                <span class="sr-only">
                                                  Loading...
                                                </span>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      ) : seachdata.length > 0 ? (
                                        seachdata.map(
                                          (
                                            {
                                              ItemCode,
                                              barcode,
                                              Description,
                                              division,
                                              department,
                                            },
                                            index
                                          ) => {
                                            return (
                                              <tr key={index}>
                                                <td>
                                                  <div className="text-left">
                                                    {Description}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    {ItemCode}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    {barcode}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    <BsPencilSquare
                                                      size={20}
                                                      onClick={() =>
                                                        this.Additemusage(
                                                          ItemCode,
                                                          Description,
                                                          department,
                                                          division,
                                                          barcode
                                                        )
                                                      }
                                                    />
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          }
                                        )
                                      ) : (
                                        <tr>
                                          <td
                                            colSpan="7"
                                            className="text-center"
                                          >
                                            No Data Available
                                          </td>
                                        </tr>
                                      )}
                                    </NormalTable>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="tab-table-content">
                                <div className="py-4">
                                  <div className="table-container">
                                    <NormalTable
                                      headerDetails={ItemoneDetails}
                                      queryHandler={(event) =>
                                        this.handleItemPageClick(event)
                                      }
                                      pageMeta={pageMeta}
                                    >
                                      {is_loading ? (
                                        <tr>
                                          <td colSpan="7">
                                            <div class="d-flex mt-5 align-items-center justify-content-center">
                                              <div
                                                class="spinner-border"
                                                role="status"
                                              >
                                                <span class="sr-only">
                                                  Loading...
                                                </span>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      ) : Itemdata.length > 0 ? (
                                        Itemdata.map(
                                          (
                                            {
                                              ItemCode,
                                              barcode,
                                              Description,
                                              division,
                                              department,
                                            },
                                            index
                                          ) => {
                                            return (
                                              <tr key={index}>
                                                <td>
                                                  <div className="text-left">
                                                    {Description}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    {ItemCode}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    {barcode}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    <BsPencilSquare
                                                      size={20}
                                                      onClick={() =>
                                                        this.Additemusage(
                                                          ItemCode,
                                                          Description,
                                                          department,
                                                          division,
                                                          barcode
                                                        )
                                                      }
                                                    />
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          }
                                        )
                                      ) : (
                                        <tr>
                                          <td
                                            colSpan="7"
                                            className="text-center"
                                          >
                                            No Data Available
                                          </td>
                                        </tr>
                                      )}
                                    </NormalTable>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="tab-table-content mt-3">
                              <div className="py-4">
                                <div className="table-container">
                                  <NormalTable headerDetails={ItemtwoDetails}>
                                    {is_loading ? (
                                      <tr>
                                        <td colSpan="7">
                                          <div class="d-flex mt-5 align-items-center justify-content-center">
                                            <div
                                              class="spinner-border"
                                              role="status"
                                            >
                                              <span class="sr-only">
                                                Loading...
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : subitemusage.length > 0 ? (
                                      subitemusage.map(
                                        (
                                          {
                                            ItemCode,
                                            Description,
                                            Quantity,
                                            UOM,
                                            Active,
                                          },
                                          index
                                        ) => {
                                          return (
                                            <tr key={index}>
                                              <td>
                                                <div className="text-left">
                                                  {ItemCode}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="text-left">
                                                  {Description}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="text-left">
                                                  {Quantity}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="text-left">
                                                  {UOM}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="text-left">
                                                  {Active == true
                                                    ? "Yes"
                                                    : "No"}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="text-left">
                                                  <RiDeleteBin5Line
                                                    size={20}
                                                    onClick={() =>
                                                      this.deleteitem(index)
                                                    }
                                                  />
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        }
                                      )
                                    ) : null}
                                  </NormalTable>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                ) : (
                  ""
                )}
                {stockdivision == "4" || stockdivision == null ? (
                  <div>
                    <div
                      className="d-flex  justify-content-between p-3 General mt-5"
                      onClick={() => this.vouchercontent()}
                    >
                      <p>{t("Voucher")}</p>
                      <div className="icon">
                        {isvoucher == false ? (
                          <AiOutlinePlus />
                        ) : (
                          <AiOutlineMinus />
                        )}
                      </div>
                    </div>
                    {isvoucher == true ? (
                      <div>
                        <div className="row">
                          <div className="col-12 col-md-8 col-lg-8">
                            <div className="mt-2">
                              <div className="d-flex col-12">
                                <div className="mt-3">
                                  <NormalCheckbox
                                    checked={vouchervalid}
                                    name="vouchervalid"
                                    onChange={this.temp}
                                  />
                                </div>
                                <p className="mt-3 text-black common-label-text">
                                  {t("Validity Period")}
                                </p>
                              </div>
                              <div className="col-12 col-md-6 col-lg-6 mt-2">
                                {vouchervalid == true ? (
                                  <NormalDate
                                    value={validvoucherdate}
                                    name="validvoucherdate"
                                    onChange={this.temp}
                                  />
                                ) : (
                                  ""
                                )}
                              </div>
                            </div>
                            <div className="d-md-flex col-12 p-0">
                              <p className="mt-3 col-12 col-md-7 col-lg-7">
                                {t("Validity Period")}
                              </p>
                              <div className="col-12 col-lg-5 col-md-5 mt-3">
                                <NormalSelect
                                  options={validperiod}
                                  value={validity}
                                  name="validity"
                                  onChange={this.handlechangestk}
                                />
                              </div>
                            </div>
                            <div className="d-md-flex col-12 p-0 mt-3">
                              <p className="col-12 col-md-7 col-lg-7">
                                {t("Value")}
                              </p>
                              <div className="col-12 col-md-5 col-lg-5">
                                <NormalInput
                                  onChange={this.handlechangestk}
                                  value={vouchervalue}
                                  type="number"
                                  placeholder="Enter tha value"
                                  name="vouchervalue"
                                />
                              </div>
                            </div>
                            <div className="d-flex col-12">
                              <div className="mt-4 mt-2">
                                <input
                                  type="radio"
                                  name="amount"
                                  checked={true}
                                />
                                <label className="ml-2 mt-2">
                                  {t("Amount")}
                                </label>

                                <input
                                  type="radio"
                                  name="amount"
                                  className="ml-3"
                                />
                                <label className="ml-2 mt-2">
                                  {t("Percent")}
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                ) : (
                  ""
                )}
                {stockdivision == "5" || stockdivision == null ? (
                  <div>
                    <div
                      className="d-flex  justify-content-between p-3 General mt-5"
                      onClick={() => this.Prepaidcontent()}
                    >
                      <p>{t("Prepaid")}</p>
                      <div className="icon">
                        {isprepaid == false ? (
                          <AiOutlinePlus />
                        ) : (
                          <AiOutlineMinus />
                        )}
                      </div>
                    </div>
                    {isprepaid == true ? (
                      <div>
                        <div className="container-fluid">
                          <div className="row">
                            <div className="col-12 col-md-7 col-lg-7">
                              <div className="d-md-flex">
                                <p className="mt-3 text-black common-label-text col-12 col-md-3 col-lg-3">
                                  {t("Valid Period")}
                                </p>
                                <div className="col-12 col-md-4 col-lg-4 mt-3 ml-6">
                                  <NormalSelect
                                    options={validperiod}
                                    value={validity}
                                    name="validity"
                                    onChange={this.handlechangestk}
                                  />
                                </div>
                                <div className="col-12 p-0 d-flex ml-3 ml-md-0 ml-lg-0">
                                  <div className="mt-3">
                                    <NormalCheckbox
                                      checked={card_noacc}
                                      name="card_noacc"
                                      onChange={this.handlechangestk}
                                    />
                                  </div>
                                  <p className="mt-3 text-black common-label-text ">
                                    {t("Member Card No Accessible")}
                                  </p>
                                </div>
                              </div>
                              <div className="d-md-flex">
                                <p className="mt-3 text-black common-label-text col-12 col-md-3 col-lg-3">
                                  {t("Inclusive Type")}
                                </p>
                                <div className="col-12 col-md-4 col-lg-4 mt-3 ml-6">
                                  <NormalSelect
                                    options={Inclusive_type}
                                    value={inclusive}
                                    name="inclusive"
                                    onChange={this.temp}
                                  />
                                </div>
                                <div className="d-flex d-flex ml-3 ml-md-0 ml-lg-0">
                                  <div className="mt-3">
                                    <NormalCheckbox
                                      checked={prepaidall}
                                      name="prepaidall"
                                      onChange={this.handlechangestk}
                                    />
                                  </div>
                                  <p className="mt-3 text-black common-label-text">
                                    {t("All")}
                                  </p>
                                </div>
                                <div className="col-12 col-md-4 col-lg-4 mt-3 ml-6">
                                  <NormalSelect
                                    options={prepaid_inclusive}
                                    value={prepaidinclusive}
                                    disabled={prepaidall == true ? true : false}
                                    onChange={this.handlechangestk}
                                    name="prepaidinclusive"
                                  />
                                </div>
                              </div>
                              <div className="d-md-flex">
                                <p className="mt-3 text-black common-label-text col-12 col-md-3 col-lg-3">
                                  {t("Exclusive")}
                                </p>
                                <div className="mt-3 text-black common-label-text col-12 col-md-4 col-lg-4">
                                  <NormalSelect
                                    options={exclusive_type}
                                    value={exclusive}
                                    name="exclusive"
                                    onChange={this.temp}
                                  />
                                </div>
                                <div className="col-12 col-md-4 col-lg-4 mt-3 ml-0 ml-md-5 ml-lg-5">
                                  <NormalSelect
                                    options={prepaid_exclusive}
                                    value={prepaidexclusive}
                                    name="prepaidexclusive"
                                    onChange={this.handlechangestk}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="col-12 col-md-5 col-lg-5 mt-3 mt-md-5 mt-lg-5">
                              <div className="d-md-flex">
                                <div className="col-12 col-md-4 col-lg-4 mt-1 mt-md-4 mt-lg-4">
                                  <NormalInput
                                    placeholder="price"
                                    type="number"
                                    value={prepaidprice}
                                    name="prepaidprice"
                                    onChange={this.handlechangestk}
                                  />
                                </div>
                                <div className="col-4 mt-4 ml-6">
                                  <div className="d-flex">
                                    <div className="mt-3">
                                      <input
                                        type="radio"
                                        name="amount"
                                        checked={true}
                                        className="mr-1"
                                      />
                                    </div>
                                    <p className="mt-3 text-black common-label-text ">
                                      {t("Amount$")}
                                    </p>
                                  </div>
                                </div>
                                <div className="col-12 col-md-4 col-lg-4 mt-4">
                                  <NormalButtonBackend
                                    mainbg={true}
                                    label={"Add"}
                                    onClick={() =>
                                      this.prapaidtable(
                                        "Inclusive",
                                        inclusive,
                                        prepaidall,
                                        prepaidinclusive,
                                        prepaidprice
                                      )
                                    }
                                  />
                                </div>
                              </div>
                              <div className="d-flex">
                                <div className="col-12 col-md-4 col-lg-4 mt-4">
                                  <NormalButtonBackend
                                    mainbg={true}
                                    label={"Add"}
                                    onClick={() =>
                                      this.prapaidtableone(
                                        "Exclusive",
                                        exclusive,
                                        prepaidexclusive
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="container-fluid">
                          <div className="tab-table-content">
                            <div className="py-4">
                              <div className="table-container">
                                <NormalTable
                                  headerDetails={prepaidDetails}
                                  // queryHandler={this.handlePagination}
                                  // pageMeta={pageMeta}
                                >
                                  {is_loading ? (
                                    <tr>
                                      <td colSpan="7">
                                        <div class="d-flex mt-5 align-items-center justify-content-center">
                                          <div
                                            class="spinner-border"
                                            role="status"
                                          >
                                            <span class="sr-only">
                                              Loading...
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : prepaidftable.length > 0 ? (
                                    prepaidftable.map(
                                      (
                                        { type, condition1, condition2, price },
                                        index
                                      ) => {
                                        return (
                                          <tr key={index}>
                                            <td>
                                              <div className="text-left">
                                                {type}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                {condition1}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                {condition2}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                {price}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                {price}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-left">
                                                {"Yes"}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="text-center cursor-pointer">
                                                <RiDeleteBin5Line
                                                  size={20}
                                                  onClick={() =>
                                                    this.Deleteprepaid(index)
                                                  }
                                                />
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      }
                                    )
                                  ) : null}
                                </NormalTable>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-12 mt-2 mt-md-5 mt-lg-5">
                          <div className="d-md-flex ">
                            <div className="col-12 col-md-2 col-lg-2 mt-3">
                              {t("Prepaid Value")}
                            </div>
                            <div className="col-12 col-md-3 col-lg-3 mt-2 ml-6">
                              <NormalInput
                                type="number"
                                disabled={true}
                                value={prepaidamountone}
                                placeholder="Enter the Amount"
                              />
                            </div>
                            <div className="col-2"></div>
                            <div className="col-12 col-md-2 col-lg-2 mt-3">
                              {t("Prepaid Amount")}
                            </div>
                            <div className="col-12 col-md-3 col-lg-3 mt-2 ml-6">
                              <NormalInput
                                type="number"
                                value={prepaidamount}
                                placeholder="Enter the Amount"
                                onChange={this.handlechangestk}
                                name="prepaidamount"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                ) : (
                  ""
                )}
                {stockdivision == "3" ||
                stockdivision == "4" ||
                stockdivision == "5" ? (
                  <div>
                    <div
                      className="d-flex justify-content-between p-3 General mt-5"
                      onClick={() => this.servicecontent()}
                    >
                      <p>{t("Service Option")}</p>
                      <div className="icon">
                        {isservice == false ? (
                          <AiOutlinePlus />
                        ) : (
                          <AiOutlineMinus />
                        )}
                      </div>
                    </div>
                    {isservice == true ? (
                      <div>
                        <div className="container-fluid mt-3">
                          <div className="itemmaster-container">
                            <div className="align-items-center">
                              <div className="col-12">
                                <div className="col-12 col-md-4 col-lg-4 mt-4">
                                  {t("Flexi Points")}
                                </div>
                                <div className="col-12 col-md-4 col-lg-4 mt-3">
                                  <NormalInput
                                    type="number"
                                    value={flexiPoints}
                                    placeholder="Enter Flexi Points"
                                    onChange={this.handlechangestk}
                                    name="flexiPoints"
                                  />
                                </div>
                                <div className="col-12 mt-3 d-flex">
                                  <div className="d-flex mt-1">
                                    <NormalCheckbox
                                      checked={serviceExpireActive}
                                      name="serviceExpireActive"
                                      onChange={this.handlechangestk}
                                    />
                                    <p>{t("Expiry Status")}</p>
                                  </div>
                                  {serviceExpireActive == true ? (
                                    <div className="d-flex ml-2">
                                      <NormalInput
                                        value={serviceExpireMonth}
                                        name="serviceExpireMonth"
                                        type="number"
                                        onChange={this.handlechangestk}
                                      />
                                    </div>
                                  ) : null}
                                  <p className="ml-3 mt-1">{t("Month(s)")}</p>
                                </div>
                                <div className="col-12 mt-3 d-flex">
                                  <div className="d-flex mt-1">
                                    <NormalCheckbox
                                      checked={treatmentLimitActive}
                                      name="treatmentLimitActive"
                                      onChange={this.handlechangestk}
                                    />
                                    <p>{t("Service Limit")}</p>
                                  </div>
                                  {treatmentLimitActive == true ? (
                                    <div className="d-flex ml-2">
                                      <NormalInput
                                        value={treatmentLimitCount}
                                        name="treatmentLimitCount"
                                        type="number"
                                        onChange={this.handlechangestk}
                                      />
                                    </div>
                                  ) : null}
                                  <p className="ml-3 mt-1">{t("Xs")}</p>
                                </div>
                                <div className="col-12 mt-3 d-flex">
                                  <div className="d-flex mt-1">
                                    <NormalCheckbox
                                      checked={limitserviceFlexionly}
                                      name="limitserviceFlexionly"
                                      onChange={this.handlechangestk}
                                    />
                                    <p>{t("Limited Service-Flexi Only")}</p>
                                  </div>
                                </div>
                                {limitserviceFlexionly == true ? (
                                  <div className="row d-flex justify-content-between">
                                    <div className="col-md-8 mt-4 text-left">
                                      <span>{t("3. Service Search")}</span>
                                    </div>
                                    <div className="col-md-4 mt-3 text-right">
                                      <InputSearch
                                        placeholder={t("Search")}
                                        onChange={this.filterBySearch}
                                        type="search"
                                      />
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            {limitserviceFlexionly == true &&
                            searchone.length > 1 ? (
                              <div className="tab-table-content">
                                <div className="py-4">
                                  <div className="table-container">
                                    <NormalTable
                                      headerDetails={headerService}
                                      pageMeta={pageMeta}
                                      queryHandler={(event) =>
                                        this.handlePagenation(event)
                                      }
                                    >
                                      {is_loading ? (
                                        <tr>
                                          <td colSpan="7">
                                            <div class="d-flex mt-5 align-items-center justify-content-center">
                                              <div
                                                class="spinner-border"
                                                role="status"
                                              >
                                                <span class="sr-only">
                                                  Loading...
                                                </span>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      ) : filtersearch.length > 0 ? (
                                        filtersearch.map(
                                          (
                                            {
                                              stockcode,
                                              stockname,
                                              uom,
                                              brand,
                                              linkCode,
                                              range,
                                              onhandQty,
                                              itemNo,
                                            },
                                            index
                                          ) => {
                                            return (
                                              <tr key={index}>
                                                <td className="position-relative cursor-pointer">
                                                  <div className="text-left cursor-pointer">
                                                    {stockcode}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    {stockname}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    {uom}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    {brand}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    {linkCode}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    {range}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    {onhandQty}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="text-left">
                                                    {itemNo}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div className="d-flex align-items-center justify-content-center cursor-pointer">
                                                    <FaRegHandPointUp
                                                      size={20}
                                                      color="blue"
                                                      onClick={() =>
                                                        this.addsearch(
                                                          stockcode,
                                                          stockname,
                                                          itemNo
                                                        )
                                                      }
                                                    />
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          }
                                        )
                                      ) : null}
                                    </NormalTable>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              limitserviceFlexionly && (
                                <div className="tab-table-content">
                                  <div className="py-4">
                                    <div className="table-container">
                                      <NormalTable
                                        headerDetails={headerService}
                                        pageMeta={pageMeta}
                                        queryHandler={(event) =>
                                          this.handlePagenation(event)
                                        }
                                      >
                                        {is_loading ? (
                                          <tr>
                                            <td colSpan="7">
                                              <div class="d-flex mt-5 align-items-center justify-content-center">
                                                <div
                                                  class="spinner-border"
                                                  role="status"
                                                >
                                                  <span class="sr-only">
                                                    Loading...
                                                  </span>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        ) : List.length > 0 ? (
                                          List.map(
                                            (
                                              {
                                                stockcode,
                                                stockname,
                                                uom,
                                                brand,
                                                linkCode,
                                                range,
                                                onhandQty,
                                                itemNo,
                                              },
                                              index
                                            ) => {
                                              return (
                                                <tr key={index}>
                                                  <td className="position-relative status-type">
                                                    <div className="text-left cursor-pointer">
                                                      {stockcode}
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <div className="text-left">
                                                      {stockname}
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <div className="text-left">
                                                      {uom}
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <div className="text-left">
                                                      {brand}
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <div className="text-left">
                                                      {linkCode}
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <div className="text-left">
                                                      {range}
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <div className="text-left">
                                                      {onhandQty}
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <div className="text-left">
                                                      {itemNo}
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <div className="d-flex align-items-center justify-content-center cursor-pointer">
                                                      <FaRegHandPointUp
                                                        size={20}
                                                        color="blue"
                                                        onClick={() =>
                                                          this.addsearch(
                                                            stockcode,
                                                            stockname,
                                                            itemNo
                                                          )
                                                        }
                                                      />
                                                    </div>
                                                  </td>
                                                </tr>
                                              );
                                            }
                                          )
                                        ) : null}
                                      </NormalTable>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                            {limitserviceFlexionly == true ? (
                              <div>
                                <span>{t("4. Service Available")}</span>
                                <div className="tab-table-content mt-3">
                                  <div className="py-4">
                                    <div className="table-container">
                                      <NormalTable
                                        headerDetails={Serviceheader}
                                      >
                                        {is_loading ? (
                                          <tr>
                                            <td colSpan="7">
                                              <div class="d-flex mt-5 align-items-center justify-content-center">
                                                <div
                                                  class="spinner-border"
                                                  role="status"
                                                >
                                                  <span class="sr-only">
                                                    Loading...
                                                  </span>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        ) : subtable.length > 0 ? (
                                          subtable.map(
                                            (
                                              { itemSrvcode, itemSrvdesc },
                                              index
                                            ) => {
                                              return (
                                                <tr key={index}>
                                                  <td>
                                                    <div className="text-left">
                                                      {index + 1}
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <div className="text-left">
                                                      {itemSrvdesc}
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <div className="text-left">
                                                      {itemSrvcode}
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <div className="text-left">
                                                      <RiDeleteBin5Line
                                                        size={20}
                                                        onClick={() =>
                                                          this.deletesearchitem(
                                                            index
                                                          )
                                                        }
                                                      />
                                                    </div>
                                                  </td>
                                                </tr>
                                              );
                                            }
                                          )
                                        ) : null}
                                      </NormalTable>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                ) : (
                  ""
                )}
                {stockdivision == "3" ? (
                  <div>
                    <div
                      className="d-flex justify-content-between p-3 General mt-5"
                      onClick={() => this.itemContent()}
                    >
                      <p>{t("Item Content")}</p>
                      <div className="icon">
                        {isItemContent == false ? (
                          <AiOutlinePlus />
                        ) : (
                          <AiOutlineMinus />
                        )}
                      </div>
                    </div>
                    {isItemContent == true ? (
                      <div>
                        <div className="container-fluid mt-3">
                          <div className="itemmaster-container">
                            <div className="align-items-center">
                              <div className="col-12">
                                <div className="d-flex align-items-center">
                                  <div className="col-md-5">
                                    <div className="col-12 col-md-9 col-lg-4 mt-4">
                                      {t("Content Detail 1")}
                                    </div>
                                    <div className="col-12 col-md-12 col-lg-4 col-xl-9 mt-3">
                                      <NormalInput
                                        type="text"
                                        value={contentDetailOne}
                                        placeholder="Enter Content Details One"
                                        onChange={this.handlechangestk}
                                        name="contentDetailOne"
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-5">
                                    <div className="col-12 col-md-9 col-lg-4 mt-4">
                                      {t("Content Detail 2")}
                                    </div>
                                    <div className="col-12 col-md-12 col-lg-4 col-xl-9 mt-3">
                                      <NormalInput
                                        type="text"
                                        value={contentDetailTwo}
                                        placeholder="Enter Content Details "
                                        onChange={this.handlechangestk}
                                        name="contentDetailTwo"
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-2 mt-5">
                                    <NormalButtonBackend
                                      mainbg={true}
                                      label={contentEditId ? "Update" : "Add"}
                                      onClick={() => this.AddContentDetails()}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="tab-table-content">
                                <div className="py-4">
                                  <div className="table-container">
                                    <NormalTable headerDetails={contentHeader}>
                                      {is_loading ? (
                                        <tr>
                                          <td colSpan="7">
                                            <div class="d-flex mt-5 align-items-center justify-content-center">
                                              <div
                                                class="spinner-border"
                                                role="status"
                                              >
                                                <span class="sr-only">
                                                  Loading...
                                                </span>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      ) : contentDetails.length > 0 ? (
                                        contentDetails.map((item, index) => {
                                          return (
                                            <tr>
                                              <td className="">
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {item.contentLineNo}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {item.contentDetail1}
                                                </div>
                                              </td>
                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  {item.contentDetail2}
                                                </div>
                                              </td>

                                              <td>
                                                <div className="d-flex align-items-center justify-content-start">
                                                  <NormalCheckbox
                                                    checked={item.isActive}
                                                    onChange={(e) =>
                                                      this.handleItemContentUpdate(
                                                        item
                                                      )
                                                    }
                                                  />
                                                </div>
                                              </td>

                                              <td>
                                                <div className="d-flex align-items-center justify-content-around cursor-pointer">
                                                  <BsPencilSquare
                                                    size={20}
                                                    onClick={() =>
                                                      this.handleEditContent(
                                                        item
                                                      )
                                                    }
                                                  />
                                                  <RiDeleteBin5Line
                                                    size={20}
                                                    onClick={() =>
                                                      this.handleDeleteItemContent(
                                                        item.id
                                                      )
                                                    }
                                                  />
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      ) : null}
                                    </NormalTable>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                ) : (
                  ""
                )}
                <div
                  className="d-flex  justify-content-between p-3 General mt-5"
                  onClick={() => this.Accountcodecontent()}
                >
                  <p>{t("Account Code")}</p>
                  <div className="icon">
                    {isaccode == false ? <AiOutlinePlus /> : <AiOutlineMinus />}
                  </div>
                </div>
                {isaccode == true ? (
                  <div className="container-fluid">
                    <div className="col-12 d-md-flex d-lg-flex mt-3 justify-content-center">
                      <div className="mt-1 text-center">
                        <p>{t("Account Code")}</p>
                      </div>
                      <div className="col-12 col-md-4 col-lg-4 mt-3 mt-md-0 mt-lg-0">
                        <NormalInput
                          placeholder={"Enter account code"}
                          value={account_no}
                          type="number"
                          onChange={this.temp}
                          name="account_no"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  ""
                )}
                {tax == true ? (
                  <>
                    <div
                      className="d-flex  justify-content-between p-3 General mt-5"
                      onClick={() => this.taxcodecontent()}
                    >
                      <p>{t("Tax Code")}</p>
                      <div className="icon">
                        {istaxcode == false ? (
                          <AiOutlinePlus />
                        ) : (
                          <AiOutlineMinus />
                        )}
                      </div>
                    </div>
                    {istaxcode == true ? (
                      <div className="container-fluid ">
                        <div className="row">
                          <div className="col-12 col-md-6 col-lg-6">
                            <div className="mt-3">
                              <span>{t("1st Tax Code")}</span>
                              <span className="star">*</span>
                              <div className="input-group">
                                <NormalSelect
                                  options={taxoneop}
                                  value={taxone}
                                  onChange={this.temp}
                                  name="taxone"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="col-12 col-md-6 col-lg-6">
                            <div className="mt-3">
                              <span>{t("2nd Tax Code")}</span>
                              <span className="star">*</span>
                              <div className="d-flex">
                                <div className="input-group">
                                  <NormalSelect
                                    options={taxtwoop}
                                    value={taxtwo}
                                    onChange={this.temp}
                                    name="taxtwo"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </>
                ) : (
                  ""
                )}
              </div>
              <div className="mt-4 col-md-3">
                <NormalButtonBackend
                  mainbg={true}
                  label={"Add"}
                  onClick={() => this.Additem()}
                />
              </div>
            </div>
            <NormalModal
              className={"payment-modal"}
              style={{ minWidth: "50%" }}
              modal={isOpendepartment}
              handleModal={this.handleDialog}
            >
              <img
                onClick={this.handleDialog}
                className="close cursor-pointer"
                src={closeIcon}
                alt=""
              />
              <Departmentpopup
                handleModal={this.handleDialog}
                handlelist={this.listofdept}
              ></Departmentpopup>
            </NormalModal>
            <NormalModal
              className={"payment-modal"}
              style={{ minWidth: "45%" }}
              modal={isOpenbrand}
              handleModal={this.handlebrandDialog}
            >
              <img
                onClick={this.handlebrandDialog}
                className="close cursor-pointer"
                src={closeIcon}
                alt=""
              />

              <Brandpopup
                handleModal={this.handlebrandDialog}
                handlelist={this.listofbrand}
              ></Brandpopup>
            </NormalModal>
            <NormalModal
              className={"payment-modal"}
              style={{ minWidth: "60%" }}
              modal={isOpenclass}
              handleModal={this.handleclassDialog}
            >
              <img
                onClick={this.handleclassDialog}
                className="close cursor-pointer"
                src={closeIcon}
                alt=""
              />
              <Classpopup
                handleModal={this.handleclassDialog}
                handlelist={this.listofclasses}
              ></Classpopup>
            </NormalModal>
            <NormalModal
              className={"payment-modal"}
              style={{ minWidth: "80%" }}
              modal={isOpenuom}
              handleModal={this.handleuomDialog}
            >
              <div className="col-12 mx-auto">
                <div className="d-flex justify-content-end">
                  <img
                    onClick={this.handleuomDialog}
                    className="close cursor-pointer"
                    src={closeIcon}
                    alt=""
                  />
                </div>
              </div>
              <Newuompopup
                handleModal={this.handleuomDialog}
                listofuom={this.listofuomprices}
                uomsde={uomsde}
              />
            </NormalModal>
            <NormalModal
              className={"payment-modal"}
              style={{ minWidth: "40%" }}
              modal={isOpenlink}
              handleModal={this.handlelinkDialog}
            >
              <div className="col-12 mx-auto">
                <div className="d-flex justify-content-end">
                  <img
                    onClick={this.handlelinkDialog}
                    className="close cursor-pointer"
                    src={closeIcon}
                    alt=""
                  />
                </div>
              </div>
              <Newlinkpopup
                handleModal={this.handlelinkDialog}
                itemCode={control_no}
                Listoflinklist={this.listoflinklist}
                linkDesc={stockname}
              />
            </NormalModal>
            <NormalModal
              className={"payment-modal"}
              style={{ minWidth: "40%" }}
              modal={isopenlinkedit}
              handleModal={this.handleEditlinkDialog}
            >
              <img
                onClick={this.handleEditlinkDialog}
                className="close cursor-pointer"
                src={closeIcon}
                alt=""
              />
              <Editlinkpopup
                handleModal={this.handleEditlinkDialog}
                name={editval}
                code={editid}
                listoflinklist={this.listofEditlinklist}
              ></Editlinkpopup>
            </NormalModal>
            <NormalModal
              className={"payment-modal"}
              style={{ minWidth: "40%" }}
              modal={isopenitemedit}
              handleModal={this.handleEdititemDialog}
            >
              <img
                onClick={this.handleEdititemDialog}
                className="close cursor-pointer"
                src={closeIcon}
                alt=""
              />
              <div>
                <h6>Add</h6>
                <div className="mt-4 d-flex">
                  <div className="col-6">
                    <p>Item Code</p>
                    <NormalInput
                      value={itemusage_code}
                      name="item_code"
                      onChange={this.Item_Code}
                      disabled={true}
                    />
                  </div>
                  <div className="col-6">
                    <span>Item Description</span>
                    <span style={{ color: "red" }}>*</span>
                    <NormalInput
                      value={itemusage_des}
                      name="itemusage_des"
                      onChange={this.Item_Code}
                      disabled={true}
                    />
                  </div>
                </div>
                <div className="mt-4 d-flex">
                  <div className="col-6">
                    <p>UOM</p>
                    <NormalSelect
                      value={itemusage_uom}
                      options={Uoms}
                      name="itemusage_uom"
                      onChange={this.Item_Code}
                      disabled={true}
                    />
                  </div>
                  <div className="col-6">
                    <span>Qty</span>
                    <span style={{ color: "red" }}>*</span>
                    <NormalInput
                      value={itemusage_qty}
                      name="itemusage_qty"
                      onChange={this.Item_Code}
                    />
                  </div>
                </div>
                <div className="d-flex mt-3 justify-content-between">
                  <div className="pl-2">
                    <NormalButtonBackend
                      mainbg={true}
                      label={"Cancel"}
                      onClick={this.handleEdititemDialog}
                    />
                  </div>
                  <div className="pr-2">
                    <NormalButtonBackend
                      mainbg={true}
                      label={"Submit"}
                      onClick={() =>
                        this.Additemusagetable(
                          itemusage_code,
                          itemusage_des,
                          itemusage_barcode,
                          itemusage_dept,
                          itemusage_div,
                          itemusage_uom,
                          itemusage_qty,
                          itemlevelactive
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </NormalModal>

            <NormalModal
              className={"payment-modal"}
              style={{ minWidth: "50%" }}
              modal={isopenrange}
              handleModal={this.handlerangeDialog}
            >
              <img
                onClick={this.handlerangeDialog}
                className="close cursor-pointer"
                src={closeIcon}
                alt=""
              />
              <div>
                <h6>Add New Range</h6>
                <div className="mt-4 d-flex">
                  <div className="col-6">
                    <span>Code</span>
                    <span style={{ color: "red" }}>*</span>
                    <NormalInput
                      value={range_code}
                      name="range_code"
                      type="number"
                      disabled={true}
                      onChange={this.handlerange}
                    />
                  </div>
                  <div className="col-6">
                    <span>Description</span>
                    <span style={{ color: "red" }}>*</span>
                    <NormalInput
                      value={range_desc}
                      name="range_desc"
                      onChange={this.handlerange}
                    />
                  </div>
                </div>
                <div className="mt-4 d-flex">
                  <div className="col-6">
                    <span>Brand</span>
                    <span style={{ color: "red" }}>*</span>
                    <NormalSelect
                      value={range_brand}
                      name="range_brand"
                      options={brandlist}
                      onChange={this.handlerange}
                    />
                  </div>
                  <div className="col-6 d-flex mt-3">
                    <NormalCheckbox
                      checked={range_active}
                      name="range_active"
                      onChange={this.handlerange}
                    />
                    <p>{t("Active")}</p>
                  </div>
                </div>
                <div className="d-flex mt-3 justify-content-between">
                  <div className="pl-2">
                    <NormalButtonBackend
                      mainbg={true}
                      label={"Cancel"}
                      onClick={this.handlerangeDialog}
                    />
                  </div>
                  <div className="pr-2">
                    <NormalButtonBackend
                      mainbg={true}
                      label={"Submit"}
                      onClick={() =>
                        this.Addrangeitems(
                          range_code,
                          range_desc,
                          range_brand,
                          range_active
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </NormalModal>
          </>
        )}
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
      ItemDivs,
      ItemUom,
      ItemSitelists,
      VoucherConditions,
      ItemBrands,
      ItemSupplies,
      ItemDepts,
      ItemLinks,
      ItemUomprices,
      ItemTypes,
      ItemClasses,
      NewItemStocklists,
      ItemRanges,
      getStocks,
      NewItemRanges,
      NewStocks,
      createStaffPlus,
      CommGroupHdrs,
      TaxType2TaxCodes,
      PrepaidOpenConditions,
      TaxType1TaxCodes,
      NewItemLinks,
      NewPrepaidOpenConditions,
      ItemBatches,
      NewPackageDtls,
      NewItemUomprices,
      PackageDtls,
      PackageItemDetails,
      NewPackageHdrs,
      NewUsagelevels,
      NewVoucherConditions,
      VoucherConditions,
      commonCreateApi,
      Itemusagelists,
      VoucherValidPeriods,
      updateCommon,
      stockDetails,
      getBackendCommonApi,
      getCommonApi,
      commonDeleteApi,
      commonPatchApi,
      UpdateControlNo,
    },
    dispatch
  );
};

export const DataEntry = withTranslation()(
  connect(mapStateToProps, mapDispatchToProps)(DataEntryClass)
);
