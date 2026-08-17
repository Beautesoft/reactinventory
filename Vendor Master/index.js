import React, { Component } from "react";
import {
  NormalButtonBackend,
  InputSearch,
  NormalSelect,
  NormalTable,
} from "component/common";
import "./style.scss";
import { withTranslation } from "react-i18next";
import { ItemSupplies } from "redux/actions/Backend";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import moment from "moment";
import ReactPaginate from "react-paginate";

export class VendormasterClass extends Component {
  state = {
    headerDetails: [
      {
        label: "Supply Code",
        sortKey: "splyCode",
        enabled: true,
        id: "splyCode",
        singleClickFunc: () => this.handleSort("splyCode"),
      },
      {
        label: "Supplier Name",
        sortKey: "supplydesc",
        enabled: true,
        id: "supplydesc",
        singleClickFunc: () => this.handleSort("supplydesc"),
      },

      {
        label: "Supplier Date",
        sortKey: "splyDate",
        enabled: true,
        id: "splyDate",
        singleClickFunc: () => this.handleSort("splyDate"),
        divClass: "justify-content-end",
      },

      {
        label: "Active",
        sortKey: "splyactive",
        enabled: true,
        id: "splyactive",
        singleClickFunc: () => this.handleSort("splyactive"),
      },
      {
        label: "Contact NO",
        sortKey: "splyTelno",
        enabled: true,
        id: "splyTelno",
        singleClickFunc: () => this.handleSort("splyTelno"),
        divClass: "justify-content-end",
      },

      {
        label: "No. of POS",
        sortKey: "noofpos",
        enabled: true,
        id: "numberOfOpenPOs",
        singleClickFunc: () => this.handleSort("numberOfOpenPOs"),
      },
    ],
    List: [],
    option: [
      { label: 10, value: 10 },
      { label: 25, value: 25 },
      { label: 50, value: 50 },
      { label: 100, value: 100 },
    ],
    count: 10,
    is_loading: false,
    offset: 0,
    data: [],
    perPage: 10,
    currentPage: 0,
    slice: [],
    search: "",
    filterdata: [],
    pageMeta: {},
  };

  handleSort = (sortkey, order) => {
    let { slice, headerDetails, orderBy } = this.state;
    this.setState({
      orderBy: this.state.orderBy == "asc" ? "desc" : "asc",
    });
    console.log("che");
    if (orderBy === "asc") {
      slice.sort((a, b) =>
        a[sortkey] > b[sortkey] ? 1 : b[sortkey] > a[sortkey] ? -1 : 0
      );
    } else {
      slice.sort((a, b) =>
        a[sortkey] < b[sortkey] ? 1 : b[sortkey] < a[sortkey] ? -1 : 0
      );
    }
    this.setState({
      slice,
    });
  };

  temp = ({ target: { value, name } }) => {
    let { count, perPage, pageMeta } = this.state;
    if (name == "count") {
      count = value;
      perPage = value;
      this.setState({
        count,
        perPage,
        pageMeta: { ...pageMeta, per_page: perPage },
      });
      console.log(count, perPage);
      this.Listofvendors();
    }
  };

  componentDidMount = () => {
    this.Listofvendors({});
  };

  updateState = (data) => {
    if (this.state.isMounted) this.setState(data);
  };

  Listofvendors = async () => {
    this.updateState({ is_loading: true });
    await this.props.ItemSupplies().then((res) => {
      console.log(res, "response");
      let { List, pageCount, slice, pageMeta, count } = this.state;

      List = res;
      slice = List.slice(
        this.state.offset,
        this.state.offset + this.state.perPage
      );
      pageCount = Math.ceil(List.length / this.state.perPage);
      console.log(List);
      this.setState({
        pageCount,
        List,
        is_loading: false,
        slice,
        pageMeta: { ...pageMeta, total_pages: pageCount, per_page: count },
      });
      console.log(List.length, pageCount, slice);
    });
  };

  handlePageClick = (e) => {
    const selectedPage = e.page;
    const offset = selectedPage * this.state.perPage;

    this.setState(
      {
        currentPage: selectedPage,
        pageMeta: { ...this.state.pageMeta, current_page: selectedPage },
        offset: offset,
      },
      () => {
        this.Listofvendors();
      }
    );
  };

  filterByName = ({ target: { value, name } }) => {
    console.log(value, name);
    let { List, filterdata, search, seachdata, pageCount } = this.state;
    if (name == "search") {
      search = value;
      this.setState({ search });
    }
    if (search !== "") {
      filterdata = List.filter((item) => {
        return Object.values(item)
          .join("")
          .toLowerCase()
          .includes(search.toLowerCase());
      });
    }
    this.setState({ filterdata });
    console.log(filterdata);
    seachdata = filterdata.slice(
      this.state.offset,
      this.state.offset + this.state.perPage
    );
    pageCount = Math.ceil(filterdata.length / this.state.perPage);
    this.setState({ seachdata, pageCount });
  };

  Listofactivevendors = async () => {
    let { pageCount, slice } = this.state;
    let Listone = [];
    await this.props.ItemSupplies().then((res) => {
      for (let key of res) {
        if (key.splyactive == "1") {
          Listone.push({
            splyCode: key.splyCode,
            supplydesc: key.supplydesc,
            splyDate: key.splyDate,
            splyactive: key.splyactive,
            splyTelno: key.splyTelno,
            numberOfTotalPOs: key.numberOfTotalPOs,
          });
          console.log(Listone);
        }
      }

      this.setState({ Listone });

      slice = Listone.slice(
        this.state.offset,
        this.state.offset + this.state.perPage
      );
      pageCount = Math.ceil(Listone.length / this.state.perPage);
      this.setState({
        pageCount,
        is_loading: false,
        slice,
      });
    });
  };

  Listofinactivevendors = async () => {
    let { pageCount, slice } = this.state;
    let Listone = [];
    await this.props.ItemSupplies().then((res) => {
      for (let key of res) {
        if (key.splyactive == "0") {
          Listone.push({
            splyCode: key.splyCode,
            supplydesc: key.supplydesc,
            splyDate: key.splyDate,
            splyactive: key.splyactive,
            splyTelno: key.splyTelno,
            numberOfTotalPOs: key.numberOfTotalPOs,
          });
          console.log(Listone);
        }
      }

      this.setState({ Listone });

      slice = Listone.slice(
        this.state.offset,
        this.state.offset + this.state.perPage
      );
      pageCount = Math.ceil(Listone.length / this.state.perPage);
      this.setState({
        pageCount,
        is_loading: false,
        slice,
      });
    });
  };

  render() {
    let { headerDetails, is_loading, option, count, search, pageMeta } =
      this.state;
    let { t } = this.props;
    return (
      <>
        <div className="container-fluid itemmaster-container bg-white">
          <div className="row">
            <div className={"itemmaster-container col-12"}>
              <div className="align-items-center">
                <div className="col-12">
                  <h4 className="label-head text-center text-md-left text-lg-left mt-3 mb-0">
                    {t("Vendor Master")}
                  </h4>
                </div>
                <div className="col-12">
                  <p className="label-title text-center text-md-left text-lg-left mt-3 mb-0">
                    {t("List of Vendors")}
                  </p>
                </div>
                <div className="mt-3 col-12 d-md-flex justify-content-md-between m-0 p-0">
                  <div className="d-md-flex col-12 col-md-4">
                    <div className="p-1">
                      <NormalButtonBackend
                        mainbg={true}
                        label={"All"}
                        onClick={this.Listofvendors}
                      />
                    </div>
                    <div className="p-1">
                      <NormalButtonBackend
                        mainbg={true}
                        label={"Active"}
                        onClick={this.Listofactivevendors}
                      />
                    </div>
                    <div className="p-1">
                      <NormalButtonBackend
                        mainbg={true}
                        label={"Inactive"}
                        onClick={this.Listofinactivevendors}
                      />
                    </div>
                  </div>
                  <div className="p-1 col-12 col-md-4">
                    <InputSearch
                      placeholder={t("Search")}
                      onChange={this.filterByName}
                      //placeholder="Search by Supply Code / Supplier Name/Supplier Date/Contact NO"
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
                        ) : (
                          this.state.seachdata.map(
                            (
                              {
                                splyCode,
                                supplydesc,
                                splyDate,
                                numberOfOpenPOs,
                                splyTelno,
                                splyactive,
                              },
                              index
                            ) => {
                              return (
                                <tr key={index}>
                                  <td>
                                    <div
                                      className="text-left text-primary"
                                      onClick={() =>
                                        this.props.history.push(
                                          `/admin/backend/VendorId/${splyCode}`
                                        )
                                      }
                                    >
                                      {splyCode}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="text-left">
                                      {supplydesc}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="text-left">
                                      {moment(splyDate).format("MMM DD YYYY")}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="text-left">
                                      {splyactive == 1 ? "Yes" : "No"}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="text-left">{splyTelno}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">
                                      {numberOfOpenPOs}
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                          )
                        )}
                      </NormalTable>
                    </div>
                  </div>
                  {/* <ReactPaginate
                    previousLabel={"prev"}
                    nextLabel={"next"}
                    breakLabel={"..."}
                    breakClassName={"break-me"}
                    pageCount={this.state.pageCount}
                    marginPagesDisplayed={2}
                    pageRangeDisplayed={5}
                    onPageChange={(event) => this.handlePageClick(event)}
                    containerClassName={"pagination"}
                    subContainerClassName={"pages pagination"}
                    activeClassName={"active"}
                  /> */}
                </div>
              ) : (
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
                        ) : (
                          this.state.slice.map(
                            (
                              {
                                splyCode,
                                supplydesc,
                                splyDate,
                                numberOfOpenPOs,
                                splyTelno,
                                splyactive,
                              },
                              index
                            ) => {
                              return (
                                <tr key={index}>
                                  <td>
                                    <div
                                      className="text-left text-primary"
                                      onClick={() =>
                                        this.props.history.push(
                                          `/admin/backend/VendorId/${splyCode}`
                                        )
                                      }
                                    >
                                      {splyCode}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="text-left">
                                      {supplydesc}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="text-left">
                                      {moment(splyDate).format("DD/MMM/YYYY")}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="text-left">
                                      {splyactive == 1 ? "Yes" : "No"}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="text-left">{splyTelno}</div>
                                  </td>
                                  <td>
                                    <div className="text-left">
                                      {numberOfOpenPOs}
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                          )
                        )}
                      </NormalTable>
                    </div>
                  </div>
                  {/* <ReactPaginate
                    previousLabel={"prev"}
                    nextLabel={"next"}
                    breakLabel={"..."}
                    breakClassName={"break-me"}
                    pageCount={this.state.pageCount}
                    marginPagesDisplayed={2}
                    pageRangeDisplayed={5}
                    onPageChange={(event) => this.handlePageClick(event)}
                    containerClassName={"pagination"}
                    subContainerClassName={"pages pagination"}
                    activeClassName={"active"}
                  /> */}
                </div>
              )}
              <div
                className="icon"
                onClick={() =>
                  this.props.history.push(
                    `/admin/backend/vendore/vendoredetails`
                  )
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
      ItemSupplies,
    },
    dispatch
  );
};

export const Vendormaster = withTranslation()(
  connect(null, mapDispatchToProps)(VendormasterClass)
);
