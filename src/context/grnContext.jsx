import React, { createContext, useContext, useReducer } from "react";

// Initial state for GRN
const initialState = {
  goodsData: [],
  pagination: {
    where: {
      docStatus: null, // 0 for open, 1 for posted
      movCode: "GRN",
    },
    like: {
      docNo: "",
      docDate: "",
      docRef1: "",
      supplyNo: "",
      docAmt: "",
      docStatus: "",
    },
    skip: 0,
    limit: 10,
    order:'docDate DESC',
  },
  totalCount: 0, // Moved out of pagination

itemData:[],


};

// Reducer function to manage state
const grnReducer = (state, action) => {
  switch (action.type) {
    case "SET_GOODS_DATA":
      //   console.log("action.payload", action.payload);
      return { ...state, goodsData: action.payload };

    case "UPDATE_PAGINATION":
      console.log("action.payload", action.payload);
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload },
      };

    case "UPDATE_WHERE":
      return {
        ...state,
        pagination: {
          ...state.pagination,
          where: { ...state.pagination.where, ...action.payload },
        },
      };
    case "UPDATE_LIKE":
      console.log("action.payload", action.payload);

      return {
        ...state,
        pagination: {
          ...state.pagination,
          like: {
            docNo: action.payload,
            docDate: action.payload,
            docRef1: action.payload,
            supplyNo: action.payload,
            docAmt: action.payload,
            docStatus: action.payload,
          },
        },
      };

    case "SET_DEFAULT_DATA":
      return {
        ...state,
        goodsData: [],
        pagination: {
          ...state.pagination,
          where: { docStatus: null, movCode: "GRN" },
          like: {
            docNo: "",
            docDate: "",
            docRef1: "",
            supplyNo: "",
            docAmt: "",
            docStatus: "",
          },
          skip: 0,
          limit: 10,
          order:'docDate DESC',
        },
      };

    case "SET_TOTAL_COUNT":
      return { ...state, totalCount: action.payload };

    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

// Create the GRN context
const GrnContext = createContext();

// Create a provider component
export const GrnProvider = ({ children }) => {
  const [state, dispatch] = useReducer(grnReducer, initialState);

  // Actions
  const setGoodsData = (data) =>
    dispatch({ type: "SET_GOODS_DATA", payload: data });
  const updatePagination = (data) =>
    dispatch({ type: "UPDATE_PAGINATION", payload: data });
  const updateWhere = (data) =>
    dispatch({ type: "UPDATE_WHERE", payload: data });
  const updateLike = (data) => dispatch({ type: "UPDATE_LIKE", payload: data });
  const setTotalCount = (count) =>
    dispatch({ type: "SET_TOTAL_COUNT", payload: count.count });
  const setDefaultdata = () => {
    dispatch({ type: "SET_DEFAULT_DATA", payload: initialState.pagination });
    dispatch({ type: "SET_GOODS_DATA", payload: [] });
  };
  const emptyGoodsData = () => {
    dispatch({ type: "SET_GOODS_DATA", payload: [] });
  }

  return (
    <GrnContext.Provider
      value={{
        goodsData: state.goodsData,
        pagination: state.pagination,
        totalCount: state.totalCount,
        setGoodsData,
        updatePagination,
        updateWhere,
        updateLike,
        setTotalCount,
        setDefaultdata,
        emptyGoodsData
      }}
    >
      {children}
    </GrnContext.Provider>
  );
};

// Custom hook to use the GRN context
export const useGrn = () => {
  const context = useContext(GrnContext);
  if (!context) {
    throw new Error("useGrn must be used within a GrnProvider");
  }
  return context;
};
