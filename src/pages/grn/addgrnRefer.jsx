import React, { Component } from "react";
import Select from "react-select";
import Table from "../components/table";
import { Modal } from "bootstrap";
import Apiservice from "../constants/apiservice";
import { queryParamsGenerate, stockHdrs } from "../utils";
import withRouter from "../components/withRouter";
import moment from "moment";
import Toast from "../components/toast";
import ToastComponent, {
  showErrorToast,
  showSuccessToast,
} from "../components/toaster";

class AddInventory extends Component {
  constructor(props) {
    super(props);
    this.state = {
      slicedDetails: [],
      stockHdrs: {
        docNo: "",
        docDate: "",
        docStatus: 0,
        supplyNo: "",
        docRef1: "",
        docRef2: "",
        docTerm: "",
        storeNo: "BeateSoft salon",
        docRemk1: "",
        postDate: "",
        createUser: "kk",
      },
      stockList: [],
      stockHdrsDetails: [],
      controlDatas: {
        docNo: "",
        RunningNo: "",
      },
      activeTab: "detail",

      supplyList: [],
      supplyOptions: [],

      supplyPagination: {
        limit: 5,
        page: 1,
        total: null,
        name: "",
        hideLimit: true,
        range: "",
        brand: "",
      },

      cartData: [],
      showModal: false,
      totalCart: {
        qty: null,
        amt: null,
      },
      showSpinner: false,
      editIndex: null,
      editData: {
        itemRemark: "",
        docQty: "",
        docPrice: "",
      },
      filter: {
        movCode: "GRN",
        splyCode: "",
        docNo: "",
        // fields: { itemCode: true, itemDesc: true },
      },
      searchValue: "",
      supplierInfo: {
        Attn: "",
        line1: "",
        line2: "",
        line3: "",
        sline1: "",
        sline2: "",
        sline3: "",
        pcode: "",
        spcode: "",
      },
      errors: {},
      showError: false,
      errorMessage: "",
      showToast: false,
      message: "",
      pageSpinner: false,
    };
  }
  async componentDidMount() {
    console.log(this.props);
    const { docData } = this.props;
    this.setState({ pageSpinner: true });

    if (docData) {
      const filter = {
        movCode: "GRN",
        docNo: docData?.docNo,
      };
      await this.getStockHdr(filter);
      if (docData?.docStatus !== 7) await this.getStockDetails();

      await this.getStockHdrDetails(filter);
      await this.getSupplyList(this.state.stockHdrs.supplyNo);
      this.setState({ pageSpinner: false });

    } else {
    //   this.setState({ pageSpinner: true });

      const today = new Date().toISOString().split("T")[0];
      this.setState((prevState) => ({
        stockHdrs: {
          ...prevState.stockHdrs,
          docDate: today,
        },
      }));

      await this.getDocNo();
      await this.getSupplyList();
      this.setState({ showSpinner: true });
      this.setState({ pageSpinner: false });

      await this.getStockDetails();
    }

    // this.pageLimit();
  }

  componentDidUpdate = async (prevProps, prevState) => {
    const { supplyPagination, stockList, slicedDetails } = this.state;

    if (
      prevState.supplyPagination.limit !== supplyPagination.limit ||
      prevState.supplyPagination.page !== supplyPagination.page ||
      prevState.supplyPagination.total !== supplyPagination.total ||
      prevState.supplyPagination.name !== supplyPagination.name ||
      prevState.supplyPagination.brand !== supplyPagination.brand ||
      prevState.supplyPagination.range !== supplyPagination.range
    ) {
      if (supplyPagination.name) {
        console.log("Searching with pagination.name");

        const data = await this.handleSearch(supplyPagination.name, "name");
        console.log(data, "datasearch");
        this.pageLimit(data);

        this.updatePagination({
          total: data.length,
        });
      } else if (supplyPagination.brand) {
        const data = await this.handleSearch(supplyPagination.brand, "brand");
        console.log(data, "brand");
        this.pageLimit(data);

        this.updatePagination({
          total: data.length,
        });
      } else if (supplyPagination.range) {
        const data = await this.handleSearch(supplyPagination.range, "range");
        console.log(data, "range");
        this.pageLimit(data);

        this.updatePagination({
          total: data.length,
        });
      } else {
        console.log("No search term, using goodsData");

        this.updatePagination({
          total: stockList.length,
        });

        this.pageLimit(stockList);
      }
    }

    if (prevState.cartData.length !== this.state.cartData.length)
      this.calcTotalAmount();
    if (prevState.stockHdrs.supplyNo !== this.state.stockHdrs.supplyNo) {
      console.log(prevState.stockHdrs.supplyNo);

     !this.props.docData && this.setSupplierInfo();
    }
  };

  componentWillUnmount() {
    this.setState({ stockHdrs: stockHdrs });
  }

  setSupplierInfo() {
    const { stockHdrs, supplyList } = this.state;
    console.log('firstfirstfirst')
    const data = supplyList.find(
      (item, i) => stockHdrs.supplyNo === item.splyCode
    );
    this.setState({
      supplierInfo: {
        Attn: data?.splyAttn,
        line1: data?.splyAddr1,
        line2: data?.splyAddr1,
        line3: data?.splyAddr1,
        pcode: data?.splyPoscd,
        sline1: data?.splymaddr1,
        sline2: data?.splymaddr2,
        sline3: data?.splymaddr3,
        spcode: data?.splymposcd,
      },
    });
  }

  routeList() {
    this.props.navigate("/goods-receive-note?list");
  }

  getStockHdr = async (filter) => {
    try {
      const response = await Apiservice().getAPI(
        `StkMovdocHdrs${queryParamsGenerate(filter ?? this.state.filter)}`
      );

      const docDate = new Date(response[0]?.docDate)
        .toISOString()
        .split("T")[0];
      const postDate = new Date(response[0]?.postDate)
        .toISOString()
        .split("T")[0];
      const data = response[0];
      const docAmt = data?.docAmt;
      const docQty = data?.docQty;

      console.log(docAmt, typeof docAmt, docAmt.length, "docamt");
    console.log(data,'dara')

      this.setState({
        stockHdrs: {
          ...response[0],
          docDate: docDate,
          postDate: postDate,
        },
        supplierInfo: {
            Attn: data?.docAttn,
            line1: data?.baddr1,
            line2: data?.baddr2,
            line3: data?.baddr3,
            pcode: data?.bpostcode,
            sline1: data?.daddr1,
            sline2: data?.daddr2,
            sline3: data?.daddr3,
            spcode: data?.dpostcode,
          },
        showSpinner: false,
        totalCart: {
          ...this.state.totalCart,
          amt: docAmt,
          qty: docQty,
        },
      });

      //   this.pageLimit();
    } catch (err) {
      console.error(err);
    }
  };

  getStockHdrDetails = async (filter) => {
    try {
      const response = await Apiservice().getAPI(
        `StkMovdocDtls${queryParamsGenerate(filter ?? this.state.filter)}`
      );

      this.setState({
        cartData: response,
        showSpinner: false,
      });

      //   this.pageLimit();
    } catch (err) {
      console.error(err);
    }
  };

  async getSupplyList(supplycode) {
    try {
      const res = await Apiservice().getAPI(
        `ItemSupplies${queryParamsGenerate(this.state.filter)}`
      );

      const supplyOption = res
        .filter((item) => item.splyCode)
        .map((item) => ({
          label: item.supplydesc,
          value: item.splyCode,
        }));

      this.setState((prevState) => ({
        supplyList: res,
        supplyOptions: supplyOption,
        stockHdrs: {
          ...prevState.stockHdrs,
          supplyNo: supplycode ? supplycode : supplyOption[0]?.value || null,
        },
        showSpinner: false,
      }));
    } catch (err) {
      console.error("Error fetching supply list:", err);
    }
  }

  async getDocNo() {
    try {
      const codeDesc = "Goods Receive Note";
      const siteCode = "MCHQ";
      const res = await Apiservice().getAPI(
        `ControlNos?filter={"where":{"and":[{"controlDescription":"${codeDesc}"},{"siteCode":"${siteCode}"}]}}`
      );
      console.log(res);
      if (!res) return;
      const docNo = res[0].controlPrefix + res[0].siteCode + res[0].controlNo;
      this.setState((prevState) => ({
        stockHdrs: {
          ...prevState.stockHdrs,
          docNo: docNo,
        },
        controlDatas: {
          docNo: docNo,
          RunningNo: res[0].controlNo,
        },

        showSpinner: false,
      }));
      //   this.pageLimit();
    } catch (err) {
      console.error("Error fetching supply details:", err);
    }
  }

  async addNewControlNumber() {
    try {
      const { controlDatas } = this.state;

      const controlNo = controlDatas.RunningNo;

      const newControlNo = (parseInt(controlNo, 10) + 1).toString();

      const controlNosUpdate = {
        controldescription: "Goods Receive Note",
        sitecode: "MCHQ",
        controlnumber: newControlNo,
      };

      const api = "ControlNos/updatecontrol";
      const response = await Apiservice().postAPI(api, controlNosUpdate);

      if (!response) return;
    } catch (err) {}
  }

  async getStockDetails() {
    try {
      // Await the API call
      const res = await Apiservice().getAPI(
        `PackageItemDetails${queryParamsGenerate(this.state.filter)}`
      );

      console.log(typeof res[0].item_Price);
      const updatedRes = res.map((item) => ({
        ...item,
        Qty: 0,
        Price: Number(item?.item_Price),
        docAmt: null,
      }));
      // Update the state with the response
      this.setState((prevState) => ({
        stockList: updatedRes,
        supplyPagination: {
          ...prevState.supplyPagination,
          total: updatedRes.length,
        },
        showSpinner: false,
      }));
      console.log(updatedRes, "stoclupd");
      // this.pageLimit(updatedRes);
    } catch (err) {
      // Handle the error
      console.error("Error fetching supply details:", err);
    }
  }

  async postStockDetails() {
    const { cartData } = this.state;
    console.log(cartData, "data for editing");

    // this.setState({ showSpinner: true });

    try {
      for (let item of cartData) {
        let res;

        if (item.docId) {
          res = await Apiservice().patchAPI(
            `StkMovdocDtls/${item.docId}`,
            item
          );
          console.log(res, `Updated item with docId: ${item.docId}`);
        } else {
          res = await Apiservice().postAPI("StkMovdocDtls", item);
          console.log(res, "Created new item");
        }
      }

      this.setState({ showSpinner: false });
    } catch (err) {
      console.error("Error during edit or create:", err);
      this.setState({ showSpinner: false });
    }
  }

  async postStockHdr(data, type) {
    const { stockHdrsDetails, cartData } = this.state;
    // let data = [...cartData];
    console.log(data, "data stock h det post");
    if (type === "create") {
      try {
        const res = await Apiservice().postAPI("StkMovdocHdrs", data);
        console.log(res, "post");

        this.setState({
          showSpinner: false,
        });

        this.addNewControlNumber();
        // this.pageLimit();
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        let docNo = data.docNo;
        const res = await Apiservice().postAPI(
          `StkMovdocHdrs/update?[where][docNo]=${docNo}`,
          data
        );

        this.setState({
          showSpinner: false,
        });
      } catch (err) {
        console.error(err);
      }
    }
  }

  pageLimit = (filtered) => {
    const { supplyPagination, stockList, stockHdrsDetails } = this.state;
    // console.log(stockList, "su");
    let startIndex = (supplyPagination.page - 1) * supplyPagination.limit;
    let endIndex = startIndex + supplyPagination.limit;
    const sliced = filtered?.slice(startIndex, endIndex);
    console.log(sliced, "sliced");
    this.setSlicedData(sliced);
    this.setState({ showSpinner: false });
  };

  setSlicedData = (data) => {
    this.setState({
      slicedDetails: data,
    });
  };

  handleSearch = (value, type) => {
    let debounceTimer;
    this.setState({ showSpinner: true });

    return new Promise((resolve, reject) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        try {
          const filteredItems = this?.state?.stockList?.filter((items) => {
            const searchValue = value.toLowerCase();
            console.log(type);
            if (type === "name") {
              return (
                items?.stockCode
                  ?.toString()
                  ?.toLowerCase()
                  .includes(searchValue) ||
                items?.stockName
                  ?.toString()
                  ?.toLowerCase()
                  .includes(searchValue) ||
                items?.itemUom
                  ?.toString()
                  ?.toLowerCase()
                  .includes(searchValue) ||
                items?.linkCode
                  ?.toString()
                  ?.toLowerCase()
                  .includes(searchValue) ||
                items?.brandCode
                  ?.toString()
                  ?.toLowerCase()
                  .includes(searchValue) ||
                items?.range?.toString()?.toLowerCase().includes(searchValue) ||
                items?.quantity?.toString()?.toLowerCase().includes(searchValue)
              );
            } else if (type === "brand") {
              return items?.brand
                ?.toString()
                ?.toLowerCase()
                .includes(searchValue);
            } else if (type === "range") {
              return items?.range
                ?.toString()
                ?.toLowerCase()
                .includes(searchValue);
            }
            return false;
          });

          let pagina = {
            total: filteredItems.length,
          };
          this.updatePagination(pagina);

          resolve(filteredItems);
        } catch (error) {
          reject(error);
        }
      }, 500);
    });
  };

  setFilteredData = (data) => {
    this.setState({
      stockList: data,
    });
  };

  updateSearch = (value, type) => {
    console.log(value, type, "sear");
    this.setState((prevState) => ({
      supplyPagination: {
        ...prevState.supplyPagination,
        [type]: value,
      },
    }));
  };

  optionClick(event, type) {
    console.log(event);

    this.setState((prevState) => ({
      stockHdrs: {
        ...prevState.stockHdrs,
        supplyNo: event.value,
      },
      filter: {
        ...prevState.filter,
        splyCode: event.value,
      },
    }));
  }

  validateForm = () => {
    const { stockHdrs, supplierInfo, cartData, totalCart } = this.state;
    let errors = {};
    let formIsValid = true;
    if (!stockHdrs.docNo) {
      formIsValid = false;
      errors["Docno"] = "Document number is required";
    }

    if (!stockHdrs.docDate) {
      formIsValid = false;
      errors["docDate"] = "Document date is required";
    }

    if (!stockHdrs.supplyNo) {
      formIsValid = false;
      errors["supplyNo"] = "Supply number is required";
    }

    if (!stockHdrs.docTerm) {
      formIsValid = false;
      errors["docTerm"] = "Document term is required";
    }

    if (!stockHdrs.postDate) {
      formIsValid = false;
      errors["postDate"] = "Post date is required";
    }

    if (cartData.length === 0) {
      formIsValid = false;
      errors["cart"] = "cart shouldn't be empty";
    }

    if (!supplierInfo.Attn) {
        formIsValid = false;
        errors["Attn"] = "Attn  is required";
      }
      if (!supplierInfo.line1) {
        formIsValid = false;
        errors["Attn"] = "Address  is required";
      }
      if (!supplierInfo.sline1) {
        formIsValid = false;
        errors["Attn"] = "shipper Address  is required";
      }

    if (!supplierInfo.spcode) {
        formIsValid = false;
        errors["Attn"] = "shipper postal code  is required";
      }


    if (!supplierInfo.pcode) {
        formIsValid = false;
        errors["Attn"] = "postal code  is required";
      }
    this.setState({ errors });
    console.log(formIsValid, this.state.errors);

    if (!formIsValid) {
      console.log(this.state.errors);
      showErrorToast("Please fill all required fields.")
    //   this.setState({
    //     showError: true,
    //     errorMessage: "Please fill all required fields.",
    //   });
    }

    return formIsValid;
  };



  print() {
    console.log(this.state.stockList, "stlis");
    console.log(this.state.slicedDetails, "sliced");
  }
  async onSubmit(e, type) {
    e.preventDefault();
    const { stockHdrs, supplierInfo, cartData, totalCart } = this.state;

    console.log(stockHdrs, "stockHdrs");
    console.log(cartData, "cartData");
    console.log(supplierInfo, "supplierInfo");

    if (this.validateForm()) {
      let data = {
        // ...stockHdrs,
        docNo: stockHdrs.docNo,
        movCode: "GRN",
        movType: "GRN",
        storeNo: stockHdrs.storeNo,
        supplyNo: stockHdrs.supplyNo,
        docRef1: stockHdrs.docRef1,
        docRef2: stockHdrs.docRef2,
        docLines: null,
        docDate: stockHdrs.docDate,
        postDate: stockHdrs.postDate,
        docStatus: stockHdrs.docStatus,
        docTerm: stockHdrs.docTerm,
        docQty: totalCart.qty,
        docAmt: totalCart.amt,
        docAttn: supplierInfo.Attn,
        docRemk1: stockHdrs.docRemk1,

        bname: supplierInfo.Attn,
        baddr1: supplierInfo.line1,
        baddr2: supplierInfo.line2,
        baddr3: supplierInfo.line3,
        bpostcode: supplierInfo.pcode,

        daddr1: supplierInfo.sline1,
        daddr2: supplierInfo.sline2,
        daddr3: supplierInfo.sline3,
        dpostcode: supplierInfo.spcode,

        createUser: stockHdrs.createUser,
        createDate: null,
      };
      if (stockHdrs?.poId) data.poId = stockHdrs?.poId;

      let message;

      if (
        type === "save" &&
        !this.props?.docData?.docNo &&
        this.state.stockHdrs?.docStatus === 0
      ) {
        await this.postStockHdr(data, "create");
        await this.postStockDetails();
        message = "Note created successfully";
      } else if (type === "save" && this.props.docData?.docNo) {
        await this.postStockHdr(data, "update");
        await this.postStockDetails();
        message = "Note updated successfully";
      } else if (type === "post" && this.props.docData?.docNo) {
        data = {
          ...data,
          docStatus: 7,
        };
        await this.postStockHdr(data, "updateStatus");
        await this.postStockDetails();
        message = "Note posted successfully";
      }
      this.props.routeto(message);
    } else {
      console.log("Form is invalid, fix the errors and resubmit.");
    }
  }

  calcTotalAmount = () => {
    const Amount = this.state.cartData.reduce((acc, item) => {
      console.log(item.Qty, item);
      return acc + item.docQty * item.docPrice;
    }, 0);

    console.log(Amount, "amountttoal");
    const Quantity = this.state.cartData.reduce((acc, item) => {
      return acc + item.docQty;
    }, 0);
    console.log(Quantity, "Quantity");

    this.setState({
      totalCart: {
        amt: Amount,
        qty: Quantity,
      },
    });
  };

  showWithDecimal(value) {
    return value;
  }

  changeTab = (event) => {
    this.setState({ activeTab: event });
  };

  addGoods = () => {};

  handlecalc = (e, index, type) => {
    const { value } = e.target;

    const newValue = Number(value);

    const updatedStockList = structuredClone(this.state.slicedDetails);

    console.log(updatedStockList[index], "updated");
    updatedStockList[index] = {
      ...updatedStockList[index],
      [type]: newValue,
    };

    this.setState({ slicedDetails: updatedStockList }, () => {
      console.log("State after setState:", this.state.slicedDetails);
    });
  };

  handleDateChange = (e, type) => {
    if (type === "postDate") {
      let postDate = moment(e.target.value).valueOf()
      let docDate = moment(this.state.stockHdrs.docDate).valueOf()
      if (docDate > postDate)
        return showErrorToast("post date should be greater than doc date");
    }
    this.setState({
      stockHdrs: {
        ...this.state.stockHdrs,
        [type]: e.target.value,
      },
    });
  };

  handleDateChange2 = (e, type) => {
    console.log(e);
    this.setState({
      supplierInfo: {
        ...this.state.supplierInfo,
        [type]: e.target.value,
      },
    });
  };

  updatePagination = (newPagination) => {
    console.log(newPagination, "search");
    this.setState((prevState) => ({
      supplyPagination: {
        ...prevState.supplyPagination,
        ...newPagination,
      },
    }));
  };
  handleCloseModal() {
    document.getElementById("exampleModal").classList.remove("show", "d-block");
    document.getElementById("exampleModal").style.display = 'none';
    document
      .querySelectorAll(".modal-backdrop")
      .forEach((el) => el.classList.remove("modal-backdrop"));
  }

  onSave = () => {
    const { cartData, editData, editIndex } = this.state;
    console.log(editData,'edar')

    let updatedCart = [...cartData];
    let updated = {
      ...updatedCart[editIndex],
      ...editData,
      docAmt: editData.docQty * editData.docPrice,
    };
    updatedCart[editIndex] = updated;
    console.log(updatedCart[editIndex], "obj");
    console.log(updatedCart, "updated");
    this.setState({
      cartData: updatedCart,
    });
    const Amount = updatedCart.reduce((acc, item) => {
      console.log(item.Qty, item);
      return acc + item.docQty * item.docPrice;
    }, 0);

    console.log(Amount, "amountttoal");
    const Quantity = updatedCart.reduce((acc, item) => {
      return acc + item.docQty;
    }, 0);
    console.log(Quantity, "Quantity");

    this.setState({
      totalCart: {
        amt: Amount,
        qty: Quantity,
      },
    });
    this.handleCloseModal();
  };

  editPopup = (item, i) => {
    console.log(item);
    this.setState({ showModal: true });
    this.setState({
      editData: {
        itemRemark: item?.Remarks ?? "",
        docQty: item?.docQty ?? "",
        docPrice: item?.docPrice ?? "",
      },

      editIndex: i,
    });
  };

  onEditCart = (e, type) => {
    let value = e.target.value;

    this.setState((prevState) => ({
      editData: {
        ...prevState.editData,
        [type]: value,
      },
    }));
  };

  onDeleteCart = (item, i) => {
    const { cartData } = this.state;
    const data = cartData.filter((cart, index) => index !== i);

    this.setState({ cartData: data });
  };

  addToCart = (i) => {
    const { stockList, controlDatas, cartData, slicedDetails } = this.state;

    let item = slicedDetails[i];
    if (item.Qty === 0) return showErrorToast("quantity should not be empty");

    const amount = item.Qty * item.Price;

    let idCart = {
      id: i + 1,
      docAmt: amount,
      docNo: this.props?.docData?.docNo ?? controlDatas?.docNo,
      movCode: "GRN",
      movType: "GRN",
      docLineno: null,
      docDate: "",
      grnNo: "",
      refNo: "",
      itemcode: item.stockCode,
      itemdesc: item.stockName,
      itemprice: null,
      docUomtype: "",
      docUomqty: 0,
      docQty: item.Qty,
      docFocqty: 0,
      docTtlqty: item.Qty,
      docPrice: item.Price,
      docMdisc: "",
      docPdisc: 0,
      docDisc: 0,
      recQty1: 0,
      recQty2: 0,
      recQty3: 0,
      recQty5: 0,
      recTtl: 0,
      postedQty: 0,
      cancelQty: 0,
      ordMemo1: "",
      ordMemo2: "",
      ordMemo3: "",
      ordMemo4: "",
      createUser: "KK",
      createDate: "",
      docUom: item.itemUom,
      docExpdate: "",
      docBatchNo: "",
      phyNo: "",
      itmBrand: item.brandCode,
      itmRange: item.rangeCode,
      itmBrandDesc: item.brand,
      itmRangeDesc: "",
      DOCUOMDesc: item.itemUom,
      stkAdjReasonCode: "",
      itemRemark: "",
      // docId: 0
    };

    const itemExists =
      cartData.length > 0 &&
      cartData.find((data, index) => {
        console.log(data?.id, idCart.id);
        if (idCart?.itemcode === data?.itemcode) {
          const shoulAdd = window.confirm(
            `Item has already been added to the cart at position ${
              index + 1
            }. Do you want to add it again?`
          );
          return !shoulAdd;
        }

        return false;
      });

    console.log(itemExists);
    if (!itemExists) {
      let cart = {
        ...idCart,
        // id: i + 1,
      };

      this.setState((prevState) => ({
        cartData: [...prevState.cartData, cart],
      }));
    } else {
    }
    console.log(cartData, "cartdata");
  };

  render() {
    console.log(this.props);

    const { docData } = this.props;
    const {
      activeTab,
      stockHdrs,
      showSpinner,
      cartData,
      supplyPagination,
      editIndex,
      editData,
      showModal,
      slicedDetails,
      supplyOptions,
      supplierInfo,
      showError,
      errorMessage,
      totalCart,
      pageSpinner,
    } = this.state;
    const headerDetails = [
      {
        label: "Item Code",
        sortKey: "Doc Number",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
      {
        label: "Item Description",
        sortKey: "Invoice Date",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
      {
        label: "UOM",
        sortKey: "Ref Num",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
      {
        label: "Brand",
        sortKey: "Supplier",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
      {
        label: "Link Code",
        sortKey: "Total Amount",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
      {
        label: "BarCode",
        sortKey: "Status",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
      {
        label: "Range",
        sortKey: "Print",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
      {
        label: "On Hand Qty",
        sortKey: "Print",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
      {
        label: "Qty",
        sortKey: "Print",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
      {
        label: "Price",
        sortKey: "Print",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
      {
        label: "",
        sortKey: "",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
    ];

    const cartHeader = [
      {
        label: "",
        // divClass: "justify-content-end",
      },
      {
        label: "",
        // divClass: "justify-content-end",
      },
      {
        label: "No",
        divClass: "justify-content-end",
      },
      {
        label: "Item Code",
        divClass: "justify-content-end",
      },
      {
        label: "Description",
        divClass: "justify-content-end",
      },
      {
        label: "Brand",
        divClass: "justify-content-end",
      },
      {
        label: "Range",
        divClass: "justify-content-end",
      },
      {
        label: "U.Cost",
        divClass: "justify-content-end",
      },
      {
        label: "UOM",
        divClass: "justify-content-end",
      },
      {
        label: "Qty",
        divClass: "justify-content-end",
      },
      {
        label: "Amount",
        divClass: "justify-content-end",
      },
      {
        label: "Remark",
        divClass: "justify-content-end",
      },
      {
        label: "",
        divClass: "justify-content-end",
      },
      {
        label: "Action",
        divClass: "justify-content-end",
      },
      {
        label: "",
        // divClass: "justify-content-end",
      },
      {
        label: "",
        // divClass: "justify-content-end",
      },
    ];
    const Storeoptions = [
      { value: "MC01", label: "Chocolate" },
      { value: "MCHQ", label: "Strawberry" },
      { value: "MCHQ", label: "Vanilla" },
    ];
    const statusOption = [
      { value: 0, label: "Open" },
      { value: 7, label: "Posted" },
    ];

    const userOption = [
      { value: "kk", label: "KK" },
      { value: "Muthuraj", label: "Muthuraj" },
    ];

    return (
      <div>
        {pageSpinner ? (
          <div className="spinner-container">
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="add-container">
            <ToastComponent />
            <div className="box-in">
              <div className="row-in">
                <div className="section-div">
                  <div className="inText">
                    Doc No<span className="red-mand">*</span>
                  </div>
                  <input
                    value={stockHdrs.docNo}
                    className="input-field"
                    type="text"
                    disabled
                  ></input>
                </div>
                <div className="section-div">
                  <div className="inText">
                    Doc Date <span className="red-mand">*</span>
                  </div>
                  <input
                    value={stockHdrs.docDate}
                    disabled
                    type="date"
                    className="input-field"
                  ></input>
                </div>
                <div className="section-div">
                  <div className="inText">
                    Status <span className="red-mand">*</span>
                  </div>
                  <Select
                    value={statusOption.find(
                      (option) => option.value === stockHdrs.docStatus
                    )}
                    className="select-field"
                    isDisabled={true}
                    options={statusOption}
                    onChange={(e) => this.optionClick(e, "docStatus")}
                  />
                </div>
              </div>
              <div className="row-in">
                <div className="section-div">
                  <div className="inText">
                    Supply No <span className="red-mand">*</span>
                  </div>
                  <Select
                    value={supplyOptions.find(
                      (option) => option.value === stockHdrs.supplyNo
                    )}
                    // Set the selected value
                    placeholder="Select Supply No"
                    className="select-field"
                    options={supplyOptions}
                    onChange={(e) => this.optionClick(e, "supplyNo")}
                  />
                </div>
                <div className="section-div">
                  <div className="inText">
                    Delivery Date <span className="red-mand">*</span>
                  </div>
                  <input
                    value={stockHdrs.postDate}
                    className="input-field"
                    type="date"
                    onChange={(e) => this.handleDateChange(e, "postDate")}
                  ></input>
                </div>
                <div className="section-div">
                  <div className="inText">
                    Term <span className="red-mand">*</span>
                  </div>
                  <input
                    value={stockHdrs.docTerm}
                    className="input-field"
                    type="number"
                    onChange={(e) => this.handleDateChange(e, "docTerm")}
                  ></input>
                </div>
              </div>
              <div className="row-in">
                <div className="section-div">
                  <div className="inText">GR Ref 1</div>
                  <input
                    value={stockHdrs.docRef1}
                    placeholder="Enter GR Ref 1"
                    className="input-field"
                    type="string"
                    onChange={(e) => this.handleDateChange(e, "docRef1")}
                  ></input>
                </div>
                <div className="section-div">
                  <div className="inText">GR Ref 2</div>
                  <input
                    value={stockHdrs.docRef2}
                    placeholder="Enter GR Ref 2"
                    className="input-field"
                    type="string"
                    onChange={(e) => this.handleDateChange(e, "docRef2")}
                  ></input>
                </div>
                <div className="section-div">
                  <div className="inText">
                    Store Code <span className="red-mand">*</span>
                  </div>
                  <input
                    value={stockHdrs.storeNo}
                    placeholder="Enter Store Code"
                    className="input-field"
                    type="string"
                    onChange={(e) => this.handleDateChange(e, "storeNo")}
                  ></input>
                </div>
              </div>
              <div className="row-in">
                <div className="section-div">
                  <div className="inText">
                    Created By <span className="red-mand">*</span>
                  </div>
                  <Select
                    className="select-field"
                    options={userOption}
                    value={userOption.find(
                      (option) => option.value === stockHdrs.createUser
                    )}
                    isDisabled={true}
                  />
                </div>
                <div className="section-div">
                  <div className="inText">Remark</div>
                  <input
                    value={stockHdrs.docRemk1}
                    placeholder="Enter Remarks"
                    className="input-field1"
                    type="string"
                    onChange={(e) => this.handleDateChange(e, "docRemk1")}
                  ></input>
                </div>
              </div>
            </div>
            <div className="box-detail">
              <div className="tabBox">
                <div
                  onClick={() => this.changeTab("detail")}
                  className={`tab ${activeTab === "detail" ? "active" : ""}`}
                >
                  Detail
                </div>
                <div
                  onClick={() => this.changeTab("supplier")}
                  className={`tab ${activeTab === "supplier" ? "active" : ""}`}
                >
                  Supplier Info
                </div>
              </div>

              {activeTab === "detail" ? (
                <div className="tab-detail">
                  {docData?.docStatus !== 7 && (
                    <div className="detail-filter">
                      <div className="section-div ">
                        <input
                          checked={true}
                          className="input-check"
                          type="checkbox"
                        ></input>
                        <label className="ml-3">Retail Product</label>
                      </div>
                      <div className="section-div ml-3 ">
                        <input
                          checked={true}
                          className="input-check"
                          type="checkbox"
                        ></input>
                        <label className="ml-3">Salon Product</label>
                      </div>
                      <div className="section-div ml-2">
                        <input
                          placeholder="Enter Brand"
                          className="input-field ml-8"
                          type="string"
                          value={supplyPagination.brand}
                          onChange={(e) =>
                            this.updateSearch(e?.target.value, "brand")
                          }
                        ></input>
                      </div>
                      <div className="section-div ml-8">
                        <input
                          placeholder="Enter Range"
                          className="input-field"
                          type="string"
                          value={supplyPagination.range}
                          onChange={(e) =>
                            this.updateSearch(e?.target.value, "range")
                          }
                        ></input>
                      </div>
                      <div className="section-div ml-8">
                        <input
                          placeholder="Search by item code/item desc/... "
                          className="input-field a"
                          type="string"
                          value={supplyPagination.name}
                          onChange={(e) =>
                            this.updateSearch(e?.target.value, "name")
                          }
                        ></input>
                      </div>
                    </div>
                  )}

                  <div className="table-detail">
                    {docData?.docStatus !== 7 ? (
                      <Table
                        headerDetails={headerDetails}
                        pagination={supplyPagination}
                        updatePagination={this.updatePagination}
                      >
                        {showSpinner ? (
                          <tr>
                            <td colSpan={11}>
                              <div className="spinner-container">
                                <div className="spinner-border" role="status">
                                  <span className="sr-only">Loading...</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : slicedDetails?.length > 0 ? (
                          slicedDetails.map((item, i) => {
                            return (
                              <tr key={i}>
                                <td>{item.stockCode}</td>
                                <td>{item.stockName}</td>
                                <td>{item.itemUom}</td>
                                <td>{item.brand}</td>
                                <td>{item.linkCode}</td>
                                <td>{item.brandCode}</td>
                                <td>{item.range}</td>
                                <td>{item.quantity}</td>
                                <td className="text-start">
                                  <input
                                    type="number"
                                    className="input-s"
                                    value={item.Qty}
                                    onChange={(e) =>
                                      this.handlecalc(e, i, "Qty")
                                    }
                                  ></input>
                                </td>
                                <td>
                                  <input
                                    value={item.Price}
                                    type="number"
                                    className="input-s"
                                    onChange={(e) =>
                                      this.handlecalc(e, i, "Price")
                                    }
                                  ></input>
                                </td>
                                <td
                                  onClick={() => this.addToCart(i,item)}
                                  className="cursor-pointer"
                                >
                                  <i class="bi bi-hand-index"></i>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr className="no-data-row">
                            <td className="no-data-cell" colSpan={11}>
                              No Data
                            </td>
                          </tr>
                        )}
                      </Table>
                    ) : (
                      ""
                    )}

                    {cartData.length > 0 ? (
                      <div className="mt-3">
                        <Table headerDetails={cartHeader}>
                          {cartData.map((item, i) => {
                            return (
                              <tr>
                                <td>{}</td>
                                <td>{}</td>
                                <td>{i + 1}</td>
                                <td>{item.itemcode}</td>
                                <td>{item.itemdesc}</td>
                                <td>{item.itmBrandDesc}</td>
                                <td>{item.itmRangeDesc}</td>
                                <td>{item.docPrice}</td>
                                <td>{item.docUom}</td>
                                <td>{item.docQty}</td>
                                <td>{item.docAmt}</td>
                                <td>{item?.itemRemark ?? ""}</td>
                                <td className="cursor-pointer">
                                  {
                                    <i
                                      data-toggle="modal"
                                      data-target="#exampleModal"
                                      class="bi bi-pencil-fill"
                                      onClick={() => this.editPopup(item, i)}
                                    ></i>
                                  }
                                </td>
                                <td
                                  onClick={() => this.onDeleteCart(item, i)}
                                  className="cursor-pointer"
                                >
                                  <i class="bi bi-trash"></i>{" "}
                                </td>
                                <td>{}</td>
                                <td>{}</td>
                              </tr>
                            );
                          })}
                        </Table>

                        <div className="total-div">
                          <div className="txt">Total Cost</div>
                          <input
                            value={totalCart?.amt}
                            // readOnly
                            disabled
                            type="number"
                          ></input>
                        </div>
                      </div>
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              ) : (
                <div className="tab-supply">
                  <div className="row-in">
                    <div className="section-div">
                      <div className="inText">
                        Attn To<span className="red-mand">*</span>
                      </div>
                      <input
                        value={supplierInfo.Attn}
                        className="input-field"
                        type="string"
                        onChange={(e) => this.handleDateChange2(e, "Attn")}
                      ></input>
                    </div>
                  </div>

                  <div className="row-in">
                    <div className="section-div">
                      <div className="inText">
                        Address<span className="red-mand">*</span>
                      </div>
                      <input
                        value={supplierInfo.line1}
                        className="input-field"
                        type="string"
                        onChange={(e) => this.handleDateChange2(e, "line1")}
                      ></input>
                    </div>
                    <div className="section-div">
                      <div className="inText">
                        Ship To Address<span className="red-mand">*</span>
                      </div>
                      <input
                        value={supplierInfo.sline1}
                        className="input-field"
                        type="string"
                        onChange={(e) => this.handleDateChange2(e, "sline1")}
                      ></input>
                    </div>
                  </div>
                  <div className="row-in">
                    <div className="section-div">
                      <input
                        value={supplierInfo.line2}
                        className="input-field"
                        type="string"
                        onChange={(e) => this.handleDateChange2(e, "line2")}
                      ></input>
                    </div>
                    <div className="section-div">
                      <input
                        value={supplierInfo.sline2}
                        className="input-field"
                        type="string"
                        onChange={(e) => this.handleDateChange2(e, "sline2")}
                      ></input>
                    </div>
                  </div>
                  <div className="row-in">
                    <div className="section-div">
                      <input
                        value={supplierInfo.line3}
                        className="input-field"
                        type="string"
                        onChange={(e) => this.handleDateChange2(e, "line3")}
                      ></input>
                    </div>
                    <div className="section-div">
                      <input
                        value={supplierInfo.sline3}
                        className="input-field"
                        type="string"
                        onChange={(e) => this.handleDateChange2(e, "sline3")}
                      ></input>
                    </div>
                  </div>
                  <div className="row-in">
                    <div className="section-div">
                      <div className="inText">
                        Post Code<span className="red-mand">*</span>
                      </div>
                      <input
                        value={supplierInfo.pcode}
                        className="input-field"
                        type="string"
                        onChange={(e) => this.handleDateChange2(e, "pcode")}
                      ></input>
                    </div>
                    <div className="section-div">
                      <div className="inText">
                        Post Code<span className="red-mand">*</span>
                      </div>
                      <input
                        value={supplierInfo.spcode}
                        className="input-field"
                        type="string"
                        onChange={(e) => this.handleDateChange2(e, "spcode")}
                      ></input>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* {showError && showErrorToast(errorMessage)} */}
            <div
              className={`modal fade show`}
              id="exampleModal"
              tabindex="-1"
              role="dialog"
              aria-labelledby="exampleModalLabel"
              aria-hidden="true"
            >
              <div
                className="modal-dialog modal-dialog-centered show"
                role="document"
              >
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title" id="exampleModalLabel">
                      Edit Qty/Price
                    </h5>
                    <button
                      type="button"
                      className="close"
                      data-dismiss="modal"
                      aria-label="Close"
                    >
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="row-in">
                      <div className="section-div">
                        <div className="inText">Qty</div>
                        <input
                          onChange={(e) => this.onEditCart(e, "docQty")}
                          value={editData.docQty}
                          className="input-field"
                          type="string"
                        ></input>
                      </div>
                      <div className="section-div ml-4">
                        <div className="inText">
                          Price<span className="red-mand">*</span>
                        </div>
                        <input
                          onChange={(e) => this.onEditCart(e, "docPrice")}
                          value={editData.docPrice}
                          className="input-field"
                          type="string"
                        ></input>
                      </div>
                    </div>

                    <div className="remark-div">
                      <div className="inText">Remarks</div>
                      <input
                        onChange={(e) => this.onEditCart(e, "itemRemark")}
                        value={editData.itemRemark}
                        className="input-field"
                        type="string"
                      ></input>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      data-dismiss="modal"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => this.onSave()}
                    >
                      Save changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="onSave-div">
              <div
                onClick={(e) => {
                  this.onSubmit(e, "save");
                }}
                className={`btn save ${
                  stockHdrs.docStatus === 7 && "disabled"
                } `}
              >
                Save
              </div>
              <div
                onClick={(e) => {
                  this.onSubmit(e, "post");
                }}
                className={`btn post ${
                  stockHdrs.docStatus === 7 || !this.props?.docData?.docNo
                    ? "disabled"
                    : ""
                } `}
              >
                Post
              </div>
              <div onClick={() => this.props.routeto()} className="btn list">
                {/* <div onClick={() => this.print()} className="btn list"> */}
                List
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
export default withRouter(AddInventory);

