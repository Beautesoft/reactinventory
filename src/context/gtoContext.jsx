import React, { createContext, useContext, useReducer } from "react";

const initialState = {
  goodsData: [],
  isLoading: false,
  error: null,
};

const gtoReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_GOODS_DATA":
      return { ...state, goodsData: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "RESET_DATA":
      return { ...state, goodsData: [] };

    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

const GtoContext = createContext();

export const GtoProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gtoReducer, initialState);

  const setLoading = (isLoading) =>
    dispatch({ type: "SET_LOADING", payload: isLoading });

  const setGoodsData = (data) =>
    dispatch({ type: "SET_GOODS_DATA", payload: data });

  const setError = (error) => dispatch({ type: "SET_ERROR", payload: error });

  const resetData = () => dispatch({ type: "RESET_DATA" });

  return (
    <GtoContext.Provider
      value={{
        goodsData: state.goodsData,
        isLoading: state.isLoading,
        error: state.error,
        setLoading,
        setGoodsData,
        setError,
        resetData,
      }}
    >
      {children}
    </GtoContext.Provider>
  );
};

export const useGto = () => {
  const context = useContext(GtoContext);
  if (!context) {
    throw new Error("useGto must be used within a GtoProvider");
  }
  return context;
};
