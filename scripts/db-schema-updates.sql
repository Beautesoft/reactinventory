-- ============================================================
-- REACT INVENTORY - DATABASE SCHEMA UPDATES (MSSQL)
-- Idempotent - safe to run multiple times
-- ============================================================

-- 1. CREATE Stktrnbatches table (new)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Stktrnbatches')
BEGIN
  CREATE TABLE Stktrnbatches (
    id INT IDENTITY(1,1) PRIMARY KEY,
    stkTrnId INT NOT NULL,
    batchNo NVARCHAR(50) NOT NULL,
    batchQty DECIMAL(18,4) NOT NULL,
    CONSTRAINT FK_Stktrnbatches_Stktrns FOREIGN KEY (stkTrnId) REFERENCES Stktrns(id)
  );
END
GO

-- 2. ALTER Stktrns
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Stktrns') AND name = 'itemBatch')
  ALTER TABLE Stktrns ADD itemBatch NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Stktrns') AND name = 'itemBatchCost')
  ALTER TABLE Stktrns ADD itemBatchCost DECIMAL(18,4) NULL;
GO

-- 3. ALTER StkMovdocDtls
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('StkMovdocDtls') AND name = 'recQty1')
  ALTER TABLE StkMovdocDtls ADD recQty1 DECIMAL(18,4) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('StkMovdocDtls') AND name = 'recQty2')
  ALTER TABLE StkMovdocDtls ADD recQty2 DECIMAL(18,4) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('StkMovdocDtls') AND name = 'recQty3')
  ALTER TABLE StkMovdocDtls ADD recQty3 DECIMAL(18,4) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('StkMovdocDtls') AND name = 'recQty4')
  ALTER TABLE StkMovdocDtls ADD recQty4 DECIMAL(18,4) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('StkMovdocDtls') AND name = 'recQty5')
  ALTER TABLE StkMovdocDtls ADD recQty5 DECIMAL(18,4) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('StkMovdocDtls') AND name = 'docBatchNo')
  ALTER TABLE StkMovdocDtls ADD docBatchNo NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('StkMovdocDtls') AND name = 'docExpdate')
  ALTER TABLE StkMovdocDtls ADD docExpdate NVARCHAR(500) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('StkMovdocDtls') AND name = 'ordMemo1')
  ALTER TABLE StkMovdocDtls ADD ordMemo1 NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('StkMovdocDtls') AND name = 'ordMemo2')
  ALTER TABLE StkMovdocDtls ADD ordMemo2 NVARCHAR(500) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('StkMovdocDtls') AND name = 'ordMemo3')
  ALTER TABLE StkMovdocDtls ADD ordMemo3 NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('StkMovdocDtls') AND name = 'ordMemo4')
  ALTER TABLE StkMovdocDtls ADD ordMemo4 NVARCHAR(500) NULL;
GO

-- 4. ALTER reqs
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('reqs') AND name = 'reqRemk2')
  ALTER TABLE reqs ADD reqRemk2 NVARCHAR(500) NULL;
GO

-- 5. ALTER reqdetails
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('reqdetails') AND name = 'reqAppqty')
  ALTER TABLE reqdetails ADD reqAppqty DECIMAL(18,4) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('reqdetails') AND name = 'docUom')
  ALTER TABLE reqdetails ADD docUom NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('reqdetails') AND name = 'docBatchNo')
  ALTER TABLE reqdetails ADD docBatchNo NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('reqdetails') AND name = 'docExpdate')
  ALTER TABLE reqdetails ADD docExpdate NVARCHAR(500) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('reqdetails') AND name = 'ordMemo4')
  ALTER TABLE reqdetails ADD ordMemo4 NVARCHAR(500) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('reqdetails') AND name = 'itemRemark1')
  ALTER TABLE reqdetails ADD itemRemark1 NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('reqdetails') AND name = 'itemRemark2')
  ALTER TABLE reqdetails ADD itemRemark2 NVARCHAR(500) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('reqdetails') AND name = 'itemRemark')
  ALTER TABLE reqdetails ADD itemRemark NVARCHAR(500) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('reqdetails') AND name = 'ordMemo1')
  ALTER TABLE reqdetails ADD ordMemo1 NVARCHAR(255) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('reqdetails') AND name = 'ordMemo2')
  ALTER TABLE reqdetails ADD ordMemo2 NVARCHAR(500) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('reqdetails') AND name = 'ordMemo3')
  ALTER TABLE reqdetails ADD ordMemo3 NVARCHAR(255) NULL;
GO
