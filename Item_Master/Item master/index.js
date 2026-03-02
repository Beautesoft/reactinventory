import React, { Component } from "react";
import {
  NormalButtonBackend,
  NormalTable,
  InputSearch,
  NormalSelect,
} from "component/common";
import "./style.scss";
import { withTranslation } from "react-i18next";
import {
  getStocks,
  ItemDivs,
  ItemClasses,
  ItemDepts,
  ItemBrands,
  ItemRanges,
} from "redux/actions/Backend";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
export class ItemMasterClass extends Component {
  state = {
    headerDetails: [
      {
        label: "Stock Code",
        sortKey: "Stock Code",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
      {
        label: "Stock Name",
        sortKey: "Stock Name",
        enabled: true,
        id: "itemName",
        singleClickFunc: () => this.handleSort("itemName"),
      },
      {
        label: "Link Code",
        sortKey: "Link Code",
        enabled: true,
        id: "itemCode",
        singleClickFunc: () => this.handleSort("itemCode"),
        divClass: "justify-content-end",
      },
      {
        label: "Type",
        sortKey: "Type",
        enabled: true,
        id: "itemType",
        singleClickFunc: () => this.handleSort("itemType"),
      },
      {
        label: "Division",
        sortKey: "Division",
        enabled: true,
        id: "itemDiv",
        singleClickFunc: () => this.handleSort("itemDiv"),
      },
      {
        label: "Class",
        sortKey: "Class",
        enabled: true,
        id: "itemClass",
        singleClickFunc: () => this.handleSort("itemClass"),
      },
      {
        label: "Dept",
        sortKey: "Dept",
        enabled: true,
        id: "itemDept",
        singleClickFunc: () => this.handleSort("itemDept"),
      },
      {
        label: "Active",
        sortKey: "Active",
        enabled: true,
        id: "itemIsactive",
        singleClickFunc: () => this.handleSort("itemIsactive"),
      },
      {
        label: "Brand",
        sortKey: "Brand",
        enabled: true,
        id: "itemBrand",
        singleClickFunc: () => this.handleSort("itemBrand"),
      },
      {
        label: "Range",
        sortKey: "Range",
        enabled: true,
        id: "itemRange",
        singleClickFunc: () => this.handleSort("itemRange"),
      },
    ],
    option: [
      { label: 10, value: 10 },
      { label: 25, value: 25 },
      { label: 50, value: 50 },
      { label: 100, value: 100 },
    ],
    count: 10,
    is_loading: false,
    isoption: false,
    offset: 0,
    data: [],
    per_page: 10,
    List: [],
    orderBy: "desc",
    search: "",
    filterdata: [],
    current_page: 1,
    searchData: [],
    staffList: [],
    pageMeta: {},
    isActive: false,
    isInactive: false,
    isAll: false,
    activeButton: false,
    inactiveButton: false,
  };

  componentDidMount = () => {
    this.Listofstocks({});
  };

  updateState = (data) => {
    if (this.state.isMounted) this.setState(data);
  };

  /* List Sorting */
  handleSort = (sortkey, order) => {
    let { List, headerDetails, orderBy } = this.state;
    this.setState({
      orderBy: this.state.orderBy == "asc" ? "desc" : "asc",
    });
    if (orderBy === "asc") {
      List.sort((a, b) =>
        a[sortkey] > b[sortkey] ? 1 : b[sortkey] > a[sortkey] ? -1 : 0
      );
    } else {
      List.sort((a, b) =>
        a[sortkey] < b[sortkey] ? 1 : b[sortkey] < a[sortkey] ? -1 : 0
      );
    }
    this.setState({
      List,
    });
  };

  /* List of Stock Function */
  Listofstocks = async () => {
    this.setState({
      is_loading: true,
      activeButton: false,
      inactiveButton: false,
    });
    await this.props.getStocks().then(
      async (res) => {
        let {
          staffList,
          pageCount,
          List,
          pageMeta,
          per_page,
          count,
          current_page,
        } = this.state;
        staffList = res;
        staffList.sort((a, b) =>
          a?.itemCode?.localeCompare(b.itemCode, undefined, { numeric: true })
        );
        console.log(per_page, "perPage");
        console.log(count, "countCheck");
        List = staffList.slice(
          (current_page - 1) * per_page,
          (current_page - 1) * per_page + per_page
        );
        console.log(List, "listCheck");
        pageCount = Math.ceil(staffList.length / this.state.per_page);
        this.setState({
          staffList,
          pageCount,
          List,
          is_loading: false,
          isAll: true,
          isActive: false,
          isInactive: false,
          pageMeta: {
            ...pageMeta,
            total_pages: pageCount,
            per_page: count,
          },
        });
        await this.props.ItemDivs().then((divResponse) => {
          let { staffList } = this.state;
          staffList.forEach((item) => {
            const matchingDiv = divResponse.find(
              (list) => Number(list.itmCode) === Number(item.itemDiv)
            );
            if (matchingDiv) {
              item.itemDiv = matchingDiv.itmDesc;
            }
          });
          this.setState({
            staffList,
          });
        });
        await this.props.ItemClasses().then((classResponse) => {
          let { staffList } = this.state;
          staffList.forEach((item) => {
            const matchingDiv = classResponse.find(
              (list) => Number(list.itmCode) === Number(item.itemClass)
            );
            if (matchingDiv) {
              item.itemClass = matchingDiv.itmDesc;
            }
          });
          this.setState({
            staffList,
          });
        });
        await this.props.ItemDepts().then((deptResponse) => {
          let { staffList } = this.state;
          staffList.forEach((item) => {
            const matchingDiv = deptResponse.find(
              (list) => Number(list.itmCode) === Number(item.itemDept)
            );
            if (matchingDiv) {
              item.itemDept = matchingDiv.itmDesc;
            }
          });
          this.setState({
            staffList,
          });
        });
        await this.props.ItemBrands().then((brandResponse) => {
          let { staffList } = this.state;

          staffList.forEach((item) => {
            const matchingDiv = brandResponse.find(
              (list) => Number(list.itmCode) === Number(item.itemBrand)
            );
            if (matchingDiv) {
              item.itemBrand = matchingDiv.itmDesc;
            }
          });
          this.setState({
            staffList,
          });
        });
        await this.props.ItemRanges().then((rangeRes) => {
          let { staffList } = this.state;
          staffList.forEach((item) => {
            const matchingDiv = rangeRes.find(
              (list) => Number(list.itmCode) === Number(item.itemRange)
            );
            if (matchingDiv) {
              item.itemRange = matchingDiv.itmDesc;
            }
          });
          this.setState({
            staffList,
          });
        });
        //   });
        // };
      },
      () => {
        this.filterByName({
          target: { value: this.state.search, name: "seaarch" },
        });
      }
    );
  };

  /* List of Stock Active List */
  Activeitem = async () => {
    this.setState({
      is_loading: true,
      activeButton: true,
      inactiveButton: false,
    });
    await this.props.getStocks().then((res) => {
      let {
        pageCount,
        current_page,
        per_page,
        pageMeta,
        staffList,
        count,
        List,
      } = this.state;
      let Listone = [];
      for (let key of res) {
        if (key.itemIsactive === true) {
          Listone.push({
            itemCode: key.itemCode,
            itemName: key.itemName,
            rptCode: key.rptCode,
            itemType: key.itemType,
            itemDiv: key.itemDiv,
            itemDept: key.itemDept,
            itemClass: key.itemClass,
            itemIsactive: key.itemIsactive,
            itemBrand: key.itemBrand,
            itemRange: key.itemRange,
          });
        }
      }
      this.setState({ Listone });
      List = Listone.slice(
        (current_page - 1) * per_page,
        (current_page - 1) * per_page + per_page
      );
      pageCount = Math.ceil(Listone.length / this.state.per_page);
      this.setState(
        {
          pageMeta: {
            ...pageMeta,
            total_pages: pageCount,
          },
          pageCount,
          List,
          is_loading: false,
          isActive: true,
          isInactive: false,
          isAll: false,
        },
        () => {
          this.filterByName({
            target: { value: this.state.search, name: "search" },
          });
        }
      );
    });
  };

  /* List of stock InActive List */
  Inactiveitem = async () => {
    this.setState({
      is_loading: true,
      activeButton: false,
      inactiveButton: true,
    });
    await this.props.getStocks().then((res) => {
      let { pageCount, List, current_page, per_page, pageMeta } = this.state;
      let Listone = [];
      for (let key of res) {
        if (key.itemIsactive === false) {
          Listone.push({
            itemCode: key.itemCode,
            itemName: key.itemName,
            rptCode: key.rptCode,
            itemType: key.itemType,
            itemDiv: key.itemDiv,
            itemDept: key.itemDept,
            itemClass: key.itemClass,
            itemIsactive: key.itemIsactive,
            itemBrand: key.itemBrand,
            itemRange: key.itemRange,
          });
        }
      }
      this.setState({ Listone });
      List = Listone.slice(
        (current_page - 1) * per_page,
        (current_page - 1) * per_page + per_page
      );
      pageCount = Math.ceil(Listone.length / this.state.per_page);
      this.setState(
        {
          pageMeta: {
            ...pageMeta,
            total_pages: pageCount,
          },
          pageCount,
          List,
          is_loading: false,
          isActive: false,
          isInactive: true,
          isAll: false,
        },
        () => {
          this.filterByName({
            target: { value: this.state.search, name: "search" },
          });
        }
      );
    });
  };
  /* Pagination Limit Set Function */
  temp = ({ target: { value, name } }) => {
    let { count, per_page, pageMeta } = this.state;
    if (name == "count") {
      count = value;
      per_page = value;
      this.setState(
        {
          count,
          per_page,

          pageMeta: { ...pageMeta, per_page: value, current_page: 1 },
        },
        () => this.Listofstocks()
      );
    }
  };

  /* Select Pagination Function */
  handlePageClick = (e) => {
    let { isActive, isInactive, isAll } = this.state;
    const selectedPage = e.page;

    this.setState(
      {
        current_page: selectedPage,
        pageMeta: { ...this.state.pageMeta, current_page: +selectedPage },
      },
      () => {
        if (isActive) {
          this.Activeitem();
        } else if (isInactive) {
          this.Inactiveitem();
        } else if (isAll) {
          this.Listofstocks();
        } else {
          this.filterByName();
        }
      }
    );
  };

  //************Searching option **********//
  filterByName = ({ target: { value, name } }) => {
    let {
      staffList,
      filterdata,
      search,
      searchData,
      pageCount,
      current_page,
      per_page,
      pageMeta,
      isActive,
      isInactive,
      activeButton,
      inactiveButton,
      count,
    } = this.state;
    let filterNameData = [];
    if (name === "search") {
      search = value;
      this.setState({ search });
    }
    if (search !== "") {
      filterNameData = staffList.filter((item) => {
        const isActive = item.itemIsactive ? "True" : "False";
        const lowerCaseSearch = search.toLowerCase();
        const lowerCaseCode = item?.itemCode?.toLowerCase();
        const lowerCaseName = item.itemName.toLowerCase();
        const lowerCaseActive = isActive.toLowerCase();

        if (activeButton && !item.itemIsactive) {
          return false;
        }

        if (inactiveButton && item.itemIsactive) {
          return false;
        }

        const lowerCaseRptCode = item.rptCode?.toLowerCase() || "";
        const lowerCaseRange = item.itemRange?.toLowerCase() || "";
        const lowerCaseType = item.itemType?.toLowerCase() || "";
        const lowerCaseDiv = item.itemDiv?.toLowerCase() || "";
        const lowerCaseDept = item.itemDept?.toLowerCase() || "";
        const lowerCaseClass = item.itemClass?.toLowerCase() || "";
        const lowerCaseBrand = item.itemBrand?.toLowerCase() || "";

        return (
          lowerCaseCode.includes(lowerCaseSearch) ||
          lowerCaseName.includes(lowerCaseSearch) ||
          lowerCaseRptCode.includes(lowerCaseSearch) ||
          lowerCaseType.includes(lowerCaseSearch) ||
          lowerCaseDiv.includes(lowerCaseSearch) ||
          lowerCaseDept.includes(lowerCaseSearch) ||
          lowerCaseClass.includes(lowerCaseSearch) ||
          lowerCaseBrand.includes(lowerCaseSearch) ||
          lowerCaseRange.includes(lowerCaseSearch) ||
          lowerCaseActive.includes(lowerCaseSearch)
        );
      });
    } else {
      filterNameData = staffList;
    }
    console.log(filterNameData, "filterSearch");
    filterdata = filterNameData.slice(
      (current_page - 1) * per_page,
      (current_page - 1) * per_page + per_page
    );
    this.setState({ filterdata });
    pageCount = Math.ceil(filterNameData.length / this.state.per_page);
    this.setState({
      searchData,
      pageMeta: {
        ...pageMeta,
        total_pages: pageCount,
        per_page: count,
      },
    });
  };

  render() {
    let {
      headerDetails,
      is_loading,
      option,
      count,
      search,
      searchData,
      pageMeta,
      filterdata,
      isActive,
      isInactive,
      isAll,
      List,
    } = this.state;
    console.log(List, "searching");
    let { t } = this.props;
    return (
      <>
        <div className="container-fluid itemmaster-container bg-white">
          <div className="row">
            <div className={"itemmaster-container col-12"}>
              <div className="align-items-center">
                <div className="col-12">
                  <h4 className="label-head text-center text-md-left text-lg-left mt-3 mb-0">
                    {t("Item Master ")}
                  </h4>
                </div>
                <div className="col-12">
                  <p className="label-title text-center text-md-left text-lg-left mt-2">
                    {t("Article")}
                  </p>
                </div>
                <div className="mt-3 col-12 d-md-flex justify-content-md-between m-0 p-0">
                  <div className="d-md-flex col-12 col-md-4">
                    <div className="p-1">
                      <NormalButtonBackend
                        mainbg={true}
                        label={"All"}
                        onClick={this.Listofstocks}
                        isActive={isAll}
                      />
                    </div>
                    <div className="p-1">
                      <NormalButtonBackend
                        mainbg={true}
                        label={"Active"}
                        onClick={this.Activeitem}
                        isActive={isActive}
                      />
                    </div>
                    <div className="p-1">
                      <NormalButtonBackend
                        mainbg={true}
                        label={"Inactive"}
                        onClick={this.Inactiveitem}
                        isActive={isInactive}
                      />
                    </div>
                  </div>
                  <div className="p-1 col-12 col-md-4">
                    <InputSearch
                      onChange={(event) =>
                        this.filterByName({
                          target: { value: event.target.value, name: "search" },
                        })
                      }
                      placeholder="Search Stock Name"
                      type="search"
                    />
                  </div>
                </div>
                <div className="d-flex justify-content-center justify-content-md-start col-12 mt-3">
                  <p className="mt-2 mr-1">{t("Show")}</p>
                  <div className="p-1">
                    <NormalSelect
                      options={option}
                      value={count}
                      onChange={this.temp}
                      name="count"
                    />
                  </div>
                  <p className="mt-2 ml-1">{t("Entries")}</p>
                </div>
              </div>
              {search.length > 1 ? (
                <div className="tab-table-content">
                  <div className="py-4">
                    <div className="table-container">
                      <NormalTable
                        headerDetails={headerDetails}
                        pageMeta={pageMeta}
                        queryHandler={(event) => this.handlePageClick(event)}
                      >
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
                        ) : filterdata.length > 0 ? (
                          filterdata.map(
                            (
                              {
                                itemCode,
                                itemName,
                                rptCode,
                                itemType,
                                itemDiv,
                                itemDept,
                                itemClass,
                                itemIsactive,
                                itemBrand,
                                itemRange,
                              },
                              index
                            ) => {
                              return (
                                <tr key={index}>
                                  <td className="position-relative cursor-pointer">
                                    <div
                                      className="text-left cursor-pointer text-primary"
                                      onClick={() =>
                                        this.props.history.push(
                                          `/admin/backend/itemCode/${itemCode}`
                                        )
                                      }
                                    >
                                      {itemCode}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemName}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">{rptCode}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemType}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemDiv}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemClass}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemDept}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">
                                      {itemIsactive == true ? "True" : "False"}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemBrand}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemRange}</div>
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
                      {console.log(pageMeta, "page")}
                      <NormalTable
                        headerDetails={headerDetails}
                        pageMeta={pageMeta}
                        queryHandler={(event) => this.handlePageClick(event)}
                      >
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
                        ) : List.length > 0 ? (
                          List.map(
                            (
                              {
                                itemCode,
                                itemName,
                                rptCode,
                                itemType,
                                itemDiv,
                                itemDept,
                                itemClass,
                                itemIsactive,
                                itemBrand,
                                itemRange,
                              },
                              index
                            ) => {
                              return (
                                <tr key={index}>
                                  <td className="position-relative status-type">
                                    <div
                                      className="text-left cursor-pointer text-primary"
                                      onClick={() =>
                                        this.props.history.push(
                                          `/admin/backend/itemCode/${itemCode}`
                                        )
                                      }
                                    >
                                      {itemCode}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemName}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">{rptCode}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemType}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemDiv}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemClass}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemDept}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">
                                      {itemIsactive == true ? "True" : "False"}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemBrand}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">{itemRange}</div>
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
              <div
                className="icon "
                onClick={() =>
                  this.props.history.push(`/admin/backend/itemdataentrys`)
                }
              >
                +
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getStocks,
      ItemDivs,
      ItemClasses,
      ItemDepts,
      ItemBrands,
      ItemRanges,
    },
    dispatch
  );
};

export const ItemMaster = withTranslation()(
  connect(null, mapDispatchToProps)(ItemMasterClass)
);
