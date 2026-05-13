# Additional Fees API Reference

---

## PSI / Entrata

**API URL:** 
https://developer.entrata.com/catalog/api/5471c3a8-e16f-3b80-93b3-006060e705db/documentation/830334cb-6491-3e1c-a696-5d1f25d1da63

**Endpoint:** `POST /propertyunits`
**Method:** `getMitsPropertyUnits`

**Fee categories (Property Level):**
- Application
- Pet

---
### Additional Fee API (with no access)
**Endpoint:** `POST /Pricing` *(no access)*
**Method:** `getPricingPicklists`

---

## Yardi RentCafe
**API URL:** https://basic.rentcafeapi.com/swagger/index.html#/UnitPricingData/post_UnitPricingData_getunitleasefeesdetails

**Fee categories(Unit Level):**
- monthlyFees
- moveInFees
- addOnsFees
- situationalFees

---
### Additional Fee API (not currently using)
**API URL:** https://basic.rentcafeapi.com/swagger/index.html#/LeaseFeeDetails/post_leasefeedetails_getleasefees


**Note:** Might have more fee info. Not integrated yet But I tested its working no permission issue.

---

## RealPage

**API URL:** https://developer.realpage.com/explore/api?id=3a0df416-f2ac-4371-b5eb-08d62549d3fe&type=SOAP&routeId=6dcfc6b1-8c88-4c43-3a00-08d7e73f24fb&isApisEnabled=false

### Additional Fee API (no access — not currently using)
**Endpoint:** `RetrieveMandatoryFees` *(SOAP)*

**Note:** Retrieves mandatory fees for a specific unit. No access. Not integrated.

---

## ResMan

### V1 (`resman_service.rb`)

**Endpoint:** `POST ENV[RESMAN_BASE_URL]/GetMarketing2_0`

**Fee categories (Property Level):**
- Standard Fees

---

### V4 (`resman4_service.rb`)

**Endpoint:** `POST ENV[RESMAN_BASE_URL]/GetMarketing4_0`

**Fee categories (Property Level):**
- Standard Fees
- Pet Fees
- Parking Fees