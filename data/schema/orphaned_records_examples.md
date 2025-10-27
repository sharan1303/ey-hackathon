# Orphaned Records - Real Examples & Receipts

**Date:** 2025-10-27  
**Issue:** 74.5% (2,968 out of 3,986) of items sold are NOT in the catalogue database

---

## Executive Summary

Out of **736,391 total sales transactions**, **283,284 transactions (38.5%)** involve items that don't exist in the catalogue_prices table. This represents **€47.5 million** in revenue across 2,968 different item codes.

---

## 📋 Example 1: Single High-Value Orphaned Item

### Invoice #7927977 - January 5, 2024

**Customer:** Hiera (Belfast) Limited  
**Total Invoice:** €1,123.12

| Item Code | Quantity | Unit Price | Line Total | Catalogue Status |
|-----------|----------|------------|------------|------------------|
| ZNVMWNVMG | 1 | €1,123.12 | €1,123.12 | **❌ ORPHANED** |

**Problem:** This entire invoice contains only one line item, and it's not in the catalogue. No pricing reference exists for validation.

---

## 📋 Example 2: Extremely High-Value Orphaned Transactions

### Invoice #7944925 - September 6, 2023

**Customer:** Hydra - HEAD OFFICE  
**Total Invoice:** €1,367,436.97

| Item Code | Quantity | Unit Price | Line Total | Catalogue Status |
|-----------|----------|------------|------------|------------------|
| Hvierxvh | 1 | €1,367,436.97 | €1,367,436.97 | **❌ ORPHANED** |

### Invoice #7944926 - September 6, 2023

**Customer:** Hydra - HEAD OFFICE  
**Total Invoice:** €1,345,639.56

| Item Code | Quantity | Unit Price | Line Total | Catalogue Status |
|-----------|----------|------------|------------|------------------|
| Hvierxvh | 1 | €1,345,639.56 | €1,345,639.56 | **❌ ORPHANED** |

### Invoice #7944917 - September 29, 2023

**Customer:** ELECTRIC CENTER HEAD OFFICE  
**Total Invoice:** €275,352.75

| Item Code | Quantity | Unit Price | Line Total | Catalogue Status |
|-----------|----------|------------|------------|------------------|
| Hvierxvh | 1 | €275,352.75 | €275,352.75 | **❌ ORPHANED** |

**Problem:** Single item code "Hvierxvh" appears in multiple massive transactions totaling nearly **€3 million** with absolutely no catalogue reference! This could be:

- A special contract/project item
- A data entry error
- A one-off purchase
- A legacy system migration issue

---

## 📋 Example 3: Mixed Invoice (Orphaned + Catalogue Items)

### Invoice #7927869 - December 16, 2023

**Customer:** Hyper Elect (Trim)  
**Total Invoice:** €282,534.00

| Item Code | Quantity | Unit Price | Line Total | Catalogue Status |
|-----------|----------|------------|------------|------------------|
| I6VNKP5-KHF | 470 | €35.42 | €16,647.40 | ✓ IN CATALOGUE |
| I6VNKP5-KHF | 470 | €35.42 | €16,647.40 | ✓ IN CATALOGUE |
| I6VNKP5-KHF | 470 | €35.42 | €16,647.40 | ✓ IN CATALOGUE |
| I6VNKP5-KHF | 470 | €35.42 | €16,647.40 | ✓ IN CATALOGUE |
| *(10 more I6VNKP5-KHF lines)* | ... | ... | ... | ✓ IN CATALOGUE |
| I3939HNPUY-98 | 12 | €23.21 | €278.52 | ✓ IN CATALOGUE |
| I1NOVW-98 | 81 | €16.84 | €1,364.04 | ✓ IN CATALOGUE |
| **IZN39593987-98** | **134** | **€58.93** | **€7,896.62** | **❌ ORPHANED** |
| IWW8K4OL-98 | 61 | €15.44 | €941.84 | ✓ IN CATALOGUE |
| IHK69593939FTI-98 | 809 | €32.36 | €26,179.24 | ✓ IN CATALOGUE |
| IHH8K4-98 | 40 | €23.73 | €949.20 | ✓ IN CATALOGUE |
| IHFU594UG-75 | 15 | €25.22 | €378.30 | ✓ IN CATALOGUE |
| IHFU594UGV-75 | 12 | €86.15 | €1,033.80 | ✓ IN CATALOGUE |
| IHFU194UG-75 | 58 | €39.14 | €2,270.12 | ✓ IN CATALOGUE |
| IEI8159-98 | 330 | €23.94 | €7,900.20 | ✓ IN CATALOGUE |

**Breakdown:**

- **Total Lines:** 25
- **Orphaned Lines:** 1
- **Catalogue Lines:** 24
- **Orphaned Revenue:** €7,896.62 (2.8% of invoice)

**Problem:** One line item (IZN39593987-98) out of 25 is missing from the catalogue. This makes margin analysis and pricing validation incomplete for this €282K invoice.

---

## 📋 Example 4: Large Mixed Invoice with Many Orphaned Items

### Invoice #7981969 - March 7, 2023

**Customer:** Hyper Elect (Trim)  
**Total Invoice:** €213,115.00

**First 35 of 92 lines shown below:**

| Item Code | Quantity | Unit Price | Line Total | Catalogue Status |
|-----------|----------|------------|------------|------------------|
| IZV795993-98 | 6 | €16.35 | €98.10 | **❌ ORPHANED** |
| IZV755987-98 | 20 | €21.37 | €427.40 | **❌ ORPHANED** |
| IZV595984-98 | 35 | €21.77 | €761.95 | **❌ ORPHANED** |
| IZV595984V-98 | 12 | €50.10 | €601.20 | **❌ ORPHANED** |
| IZV515981-98 | 6 | €30.07 | €180.42 | **❌ ORPHANED** |
| IZV395984-98 | 30 | €26.17 | €785.10 | **❌ ORPHANED** |
| IZV395984V-98 | 2 | €56.78 | €113.56 | **❌ ORPHANED** |
| IZV195981V-98 | 2 | €43.46 | €86.92 | **❌ ORPHANED** |
| IZN59693939-98 | 150 | €30.23 | €4,534.50 | **❌ ORPHANED** |
| IZN39593987-98 | 5 | €56.40 | €282.00 | **❌ ORPHANED** |
| IVCH917-76 | 100 | €17.36 | €1,736.00 | **❌ ORPHANED** |
| ISZ71594UG-75 | 60 | €14.73 | €883.80 | **❌ ORPHANED** |
| ISZ7DVNHG-KHF | 150 | €30.82 | €4,623.00 | **❌ ORPHANED** |
| ISZ41594UG-75 | 60 | €30.62 | €1,837.20 | **❌ ORPHANED** |
| IIV8959K-95 | 4 | €12.06 | €48.24 | **❌ ORPHANED** |
| IIV7959K-95 | 2 | €19.59 | €39.18 | **❌ ORPHANED** |
| IIV6959K-95 | 1 | €21.60 | €21.60 | **❌ ORPHANED** |
| IFO92C5-98 | 200 | €14.62 | €2,924.00 | **❌ ORPHANED** |
| IFOHGIRN-89 | 30 | €1.27 | €38.10 | **❌ ORPHANED** |
| IEZ89975RK32-KHF | 2 | €40.29 | €80.58 | **❌ ORPHANED** |
| IEZ89975-KHF | 2 | €30.90 | €61.80 | **❌ ORPHANED** |
| IEZ84975-KHF | 1 | €30.20 | €30.20 | **❌ ORPHANED** |
| IEZ8487-KHF | 40 | €6.29 | €251.60 | **❌ ORPHANED** |
| IEZ8475-KHF | 2 | €8.20 | €16.40 | **❌ ORPHANED** |
| IEZ6987WF-KHF | 5 | €14.69 | €73.45 | **❌ ORPHANED** |
| IEZ6987-KHF | 10 | €10.29 | €102.90 | **❌ ORPHANED** |
| IEZ6975-KHF | 6 | €17.18 | €103.08 | **❌ ORPHANED** |
| IEZ4987WF-KHF | 5 | €20.47 | €102.35 | **❌ ORPHANED** |
| IEZ3987-KHF | 10 | €27.68 | €276.80 | **❌ ORPHANED** |
| IEZ3975RK32M-KHF | 4 | €18.09 | €72.36 | **❌ ORPHANED** |
| IEZ3975-KHF | 4 | €16.38 | €65.52 | **❌ ORPHANED** |
| SVW3954/W7 | 100 | €36.63 | €3,663.00 | ✓ IN CATALOGUE |
| SVW3954/W7 | 100 | €36.63 | €3,663.00 | ✓ IN CATALOGUE |
| SVW3954/W7 | 100 | €36.63 | €3,663.00 | ✓ IN CATALOGUE |
| SVW3954/W7 | 100 | €36.63 | €3,663.00 | ✓ IN CATALOGUE |

**Breakdown:**

- **Total Lines:** 92
- **Orphaned Lines:** 31 (34% of invoice)
- **Catalogue Lines:** 61
- **Orphaned Revenue:** €21,259.31 (10% of invoice value)

**Problem:** Over one-third of the line items are missing from the catalogue. This makes proper margin analysis, pricing strategy, and inventory management impossible for this invoice.

---

## 📋 Example 5: Return/Credit with Orphaned Items

### Invoice #826785 - July 6, 2021

**Customer:** Ampere Electronic PLC  
**Total Invoice:** -€91.95 (Credit)

| Item Code | Quantity | Unit Price | Line Total | Catalogue Status |
|-----------|----------|------------|------------|------------------|
| IFO9269-98 | -1 | €5.79 | -€5.79 | **❌ ORPHANED** |
| IFO9259-98 | -7 | €8.55 | -€59.85 | **❌ ORPHANED** |
| IEZ8487-KHF | -1 | €5.26 | -€5.26 | **❌ ORPHANED** |
| IEZ6987WF-KHF | -1 | €12.41 | -€12.41 | **❌ ORPHANED** |
| IEZ6987-KHF | -1 | €8.64 | -€8.64 | **❌ ORPHANED** |

**Problem:** This is a return/credit note, but all items being returned don't exist in the catalogue. This makes it impossible to validate if the credit amounts are correct against standard pricing.

---

## 📊 Top 10 Most Problematic Customers (By Orphaned Sales Count)

| Customer | Orphaned Items | Sales Count | Revenue (€) |
|----------|---------------|-------------|-------------|
| Gripz Isla Ltd (Navan) | 241 | 2,547 | 612,225 |
| Electric Center (Belfast) | 343 | 2,118 | 537,127 |
| Hyper Elect (Waterford) | 369 | 1,974 | 626,357 |
| Sorin Electrial (Bantry) | 251 | 1,642 | 98,366 |
| Hyper Elect (Carrickfergus) | 360 | 1,587 | 563,186 |
| Electric Center (Cork) | 256 | 1,575 | 245,775 |
| Tross Direct | 59 | 1,568 | 798,450 |
| Hyper Elect (Trim) | 284 | 1,430 | 560,646 |
| QUAT Elect. W/S Ltd | 241 | 1,392 | 471,774 |
| Electric Center (Ashbourne) | 207 | 1,388 | 207,676 |

---

## 🚨 Critical Findings

1. **€3M in three invoices** for item "Hvierxvh" - completely missing from catalogue
2. **ZNVMWNVMG** has generated -€3.8M in total (credits/returns) but isn't in catalogue
3. **Top item IEZ8487-KHF** appears in 11,232 transactions worth €551K but missing from catalogue
4. **Major customers** like Hyper Elect locations have 30-40% of their purchases as orphaned items
5. **Recent data** (2024) still shows new orphaned items being sold

---

## 💡 Business Impact

1. **Pricing Validation:** Cannot verify if customers are being charged correct prices
2. **Margin Analysis:** Impossible to calculate margins on 38.5% of sales
3. **Inventory Planning:** Missing cost data for nearly 3,000 items
4. **Customer Service:** Cannot look up product information for returns/warranties
5. **Financial Reporting:** €47.5M in revenue with incomplete product data
6. **Audit Risk:** Significant data quality issues that could impact compliance

---

## ✅ Recommendations

### Immediate Actions

1. **Add top 100 orphaned items** to catalogue (covers 80%+ of orphaned revenue)
2. **Investigate "Hvierxvh"** - €3M item that might be data corruption
3. **Review ZNVMWNVMG** - -€3.8M requires immediate attention
4. **Freeze new sales** of orphaned items until catalogue is updated

### Short-term

1. **Data Quality Process:** Implement validation to prevent future orphaned records
2. **Historical Cleanup:** Research and add all 2,968 items to catalogue
3. **Customer Communication:** Inform affected customers of potential pricing corrections

### Long-term

1. **System Integration:** Add foreign key constraints to prevent orphaned records
2. **Regular Audits:** Monthly reconciliation between sales and catalogue
3. **Training:** Ensure staff understand the importance of catalogue maintenance

---

## 📁 Related Files

- Full analysis: `data/schema/orphaned_records_analysis.sql`
- This document: `data/schema/orphaned_records_examples.md`
- Database: `data/voltura_data.db`
