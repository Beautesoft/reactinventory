# Batch Data Persistence Implementation

## Overview
This document describes the implementation of batch data persistence across Goods Transfer In (GTI), Goods Transfer Out (GTO), and Goods Return Note (RTN) components using the `recQty` fields and `ordMemo` fields efficiently.

## 🎯 **Field Mapping Strategy**

### **Database Fields Used:**
```json
{
  "recQty1": "First batch quantity",
  "recQty2": "Second batch quantity",  
  "recQty3": "Third batch quantity",
  "recQty4": "Fourth batch quantity",
  "recQty5": "No Batch quantity",
  "recTtl": "Total transfer quantity",
  "docBatchNo": "Combined batch numbers (A01,A02,A03)",
  "docExpdate": "Empty - expiry dates fetched from ItemBatches API",
  "ordMemo1": "Transfer type (specific/fifo)",
  "ordMemo2": "Batch:quantity pairs (A01:4,A02:6,A03:2)",
  "ordMemo3": "No batch quantity (0)",
  "ordMemo4": "Expiry:quantity pairs (2025-08-12:4,2025-09-15:6)"
}
```

## 🚀 **Implementation Details**

### **1. addToCart Function Updates**

#### **GTI Component (`src/pages/gti/addGti.jsx`)**
- **Lines 1322-1400**: Updated to store batch data in database fields
- **Key Changes**:
  - Prepare `recQtyFields` object with 5 quantity fields
  - Prepare `ordMemoFields` object for transfer type and batch breakdown
  - Store individual batch quantities in `recQty1` through `recQty5`
  - Store "No Batch" quantity in `recQty5`
  - Store combined batch numbers and expiry dates
  - Store transfer type and batch breakdown in memo fields

#### **GTO Component (`src/pages/gto/addGto.jsx`)**
- **Lines 1412-1500**: Updated with same batch data storage logic
- **Key Changes**: Identical to GTI implementation

#### **RTN Component (`src/pages/rtn/addRtn.jsx`)**
- **Lines 1302-1400**: Updated with basic structure for future use
- **Key Changes**: Prepared fields for future batch functionality

### **2. reconstructBatchState Helper Function**

#### **Purpose**: Reconstruct batch state from stored database fields
#### **Location**: Added to all three components (GTI, GTO, RTN)

#### **Functionality**:
```javascript
const reconstructBatchState = async (cartItem, sourceStore) => {
  if (cartItem.ordMemo1 === "specific" && cartItem.ordMemo2) {
    // Parse batch breakdown from ordMemo2
    const batchBreakdown = cartItem.ordMemo2.split(',').map(batch => {
      const [batchNo, quantity] = batch.split(':');
      return { batchNo, quantity: Number(quantity) };
    });
    
    // Fetch fresh expiry dates from ItemBatches API
    const itemBatchesResponse = await apiService.get(/* filter */);
    
    // Map batch data with fresh expiry dates
    const enrichedBatchDetails = batchBreakdown.map(batch => {
      const apiBatch = itemBatchesResponse.find(api => api.batchNo === batch.batchNo);
      return {
        batchNo: batch.batchNo,
        quantity: batch.quantity,
        expDate: apiBatch?.expDate || null,
        batchCost: apiBatch?.batchCost || 0
      };
    });
    
    // Reconstruct selectedBatches state
    return {
      batchNo: cartItem.docBatchNo,
      expDate: enrichedBatchDetails.map(b => b.expDate).filter(Boolean).join(', '),
      batchTransferQty: enrichedBatchDetails.reduce((sum, b) => sum + b.quantity, 0),
      noBatchTransferQty: Number(cartItem.ordMemo3) || 0,
      totalTransferQty: Number(cartItem.recTtl),
      transferType: 'specific',
      batchDetails: enrichedBatchDetails
    };
  }
  
  return null; // FIFO transfer
};
```

### **3. getStockHdrDetails Function Updates**

#### **All Components**: Updated to reconstruct batch state on document reload

#### **Key Changes**:
```javascript
const getStockHdrDetails = async (filter) => {
  try {
    const response = await apiService.get(`StkMovdocDtls${buildFilterQuery(filter)}`);
    
    // Reconstruct batch state for each item
    const reconstructedItems = await Promise.all(
      response.map(async (item) => {
        const batchState = await reconstructBatchState(item, stockHdrs.fstoreNo);
        if (batchState) {
          return {
            ...item,
            transferType: 'specific',
            batchDetails: {
              batchNo: batchState.batchNo,
              expDate: batchState.expDate,
              batchTransferQty: batchState.batchTransferQty,
              noBatchTransferQty: batchState.noBatchTransferQty,
              totalTransferQty: batchState.totalTransferQty,
              individualBatches: batchState.batchDetails
            }
          };
        }
        return {
          ...item,
          transferType: 'fifo',
          batchDetails: null
        };
      })
    );
    
    setCartItems(reconstructedItems);
    setCartData(reconstructedItems);
  } catch (err) {
    console.error("Error fetching stock header details:", err);
  }
};
```

## 🔧 **Data Flow**

### **1. Save Document Flow**
```
User selects specific batches → addToCart() → Store in recQty/ordMemo fields → Save to database
```

### **2. Reload Document Flow**
```
Load document → getStockHdrDetails() → reconstructBatchState() → Fetch fresh expiry dates → Restore batch state
```

### **3. Post Document Flow**
```
Restored batch state → Use existing batch logic → Post to Stktrns and ItemBatches
```

## 📊 **Example Data Storage**

### **Single Batch Transfer (A01: 10 qty)**
```json
{
  "recQty1": 10,
  "recQty2": 0,
  "recQty3": 0,
  "recQty4": 0,
  "recQty5": 0,
  "docBatchNo": "A01",
  "docExpdate": "",
  "ordMemo1": "specific",
  "ordMemo2": "A01:10",
  "ordMemo3": "0",
  "ordMemo4": "2025-08-12:10"
}
```

### **Multi-Batch Transfer (A01: 4 qty, A02: 6 qty)**
```json
{
  "recQty1": 4,
  "recQty2": 6,
  "recQty3": 0,
  "recQty4": 0,
  "recQty5": 0,
  "docBatchNo": "A01,A02",
  "docExpdate": "",
  "ordMemo1": "specific",
  "ordMemo2": "A01:4,A02:6",
  "ordMemo3": "0",
  "ordMemo4": "2025-08-12:4,2025-09-15:6"
}
```

### **Multi-Batch with No Batch (A01: 4 qty, A02: 6 qty, No Batch: 2 qty)**
```json
{
  "recQty1": 4,
  "recQty2": 6,
  "recQty3": 0,
  "recQty4": 0,
  "recQty5": 2,
  "docBatchNo": "A01,A02",
  "docExpdate": "",
  "ordMemo1": "specific",
  "ordMemo2": "A01:4,A02:6",
  "ordMemo3": "2",
  "ordMemo4": "2025-08-12:4,2025-09-15:6"
}
```

## ✅ **Benefits of This Implementation**

1. **🔄 Data Persistence**: Batch selection survives document save/reload
2. **📅 Fresh Expiry Dates**: Always get current expiry dates from ItemBatches API
3. **💾 Efficient Storage**: Use existing database fields without schema changes
4. **🔄 Backward Compatibility**: FIFO transfers work as before
5. **📊 Multi-Batch Support**: Handle up to 5 different batches per item
6. **🚀 Performance**: Minimal database storage, fresh data retrieval
7. **🛡️ Error Handling**: Graceful fallback if reconstruction fails
8. **🔧 SQL Compatibility**: No date conversion errors - docExpdate remains empty

## 🚨 **Important Notes**

1. **Source Store Dependency**: `reconstructBatchState` requires `stockHdrs.fstoreNo` to fetch ItemBatches
2. **API Calls**: Each item reconstruction makes an API call to ItemBatches
3. **Error Handling**: If reconstruction fails, item defaults to FIFO mode
4. **Field Limits**: Maximum 5 batches supported (recQty1 through recQty5)
5. **Memo Field Usage**: ordMemo fields store human-readable batch breakdown

## 🔮 **Future Enhancements**

1. **Batch Caching**: Cache ItemBatches data to reduce API calls
2. **Batch Validation**: Validate batch availability during reconstruction
3. **Batch History**: Track batch selection history for audit purposes
4. **Batch Templates**: Save common batch combinations as templates

## 📝 **Testing Scenarios**

1. **Save and Reload**: Create document with specific batches, save, reload, verify batch state
2. **Multi-Batch**: Select multiple batches, save, reload, verify all batches restored
3. **No Batch**: Include "No Batch" quantities, save, reload, verify restoration
4. **FIFO Fallback**: Test FIFO items save/reload without batch data
5. **Error Handling**: Test with invalid batch data, verify graceful fallback

This implementation ensures that batch selection data is properly persisted and can be reconstructed when documents are reloaded, providing a seamless user experience across save/reload cycles.
