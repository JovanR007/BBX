# Test Store Owners - Setup Instructions

## 📋 Test Data Summary
20 store owners from different countries with unique credentials.

## 🔐 Universal Password
All test accounts use: `TestPass123!`

## 📝 Quick Reference Table

| # | Owner Name | Email | Country | City | Store Name |
|---|------------|-------|---------|------|------------|
| 1 | Marcus Rodriguez | marcus.rodriguez@test.com | USA | Los Angeles | Beyblade Arena LA |
| 2 | Sarah Chen | sarah.chen@test.com | USA | New York | NYC Blade Masters |
| 3 | Takeshi Yamamoto | takeshi.yamamoto@test.com | Japan | Tokyo | Akihabara Bey Shop |
| 4 | Yuki Tanaka | yuki.tanaka@test.com | Japan | Osaka | Naniwa Battle Arena |
| 5 | Oliver Thompson | oliver.thompson@test.com | UK | London | London Spin Arena |
| 6 | Emma Wilson | emma.wilson@test.com | Canada | Toronto | Toronto Beyblade Club |
| 7 | Liam O'Brien | liam.obrien@test.com | Australia | Sydney | Sydney Burst Stadium |
| 8 | Hans Mueller | hans.mueller@test.com | Germany | Berlin | Berlin Blade Factory |
| 9 | Sophie Dubois | sophie.dubois@test.com | France | Paris | Paris Spinning Elite |
| 10 | Min-jun Kim | minjun.kim@test.com | South Korea | Seoul | Gangnam Battle Zone |
| 11 | Carlos Silva | carlos.silva@test.com | Brazil | São Paulo | São Paulo Bey Champions |
| 12 | Diego Martinez | diego.martinez@test.com | Mexico | Mexico City | Arena Beyblade CDMX |
| 13 | Wei Zhang | wei.zhang@test.com | Singapore | Singapore | Marina Bay Bladers |
| 14 | Marco Rossi | marco.rossi@test.com | Italy | Rome | Colosseum Spin Arena |
| 15 | Isabel Garcia | isabel.garcia@test.com | Spain | Barcelona | Barcelona Bey Hub |
| 16 | Josh Santos | josh.santos@test.com | Philippines | Manila | Manila Legends Arena |
| 17 | Arjun Patel | arjun.patel@test.com | India | Mumbai | Mumbai Burst Center |
| 18 | Somchai Wong | somchai.wong@test.com | Thailand | Bangkok | Bangkok Blade District |
| 19 | Ahmad Hassan | ahmad.hassan@test.com | Malaysia | Kuala Lumpur | KL Bey Masters |
| 20 | Lars van Dijk | lars.vandijk@test.com | Netherlands | Amsterdam | Amsterdam Spin Lab |

## 🚀 How to Create Test Stores

### Option 1: Manual Creation via Admin Panel (Recommended)

1. **Log in as superadmin** at `/admin` with `shearjovan7@gmail.com`

2. **For each test user**:
   - Use the "Provision New Store" form
   - Get the Stack User ID by:
     - Have them sign up normally at `/sign-up`
     - OR create them in Stack Dashboard
     - OR check Stack Auth Dashboard for user IDs
   - Fill in the form with data from `test-seed-data.json`

### Option 2: Quick Setup (5 Most Important)

Start with these 5 diverse locations for initial testing:

1. **Marcus Rodriguez** - Los Angeles, USA
   - Email: marcus.rodriguez@test.com
   - Store: beyblade-arena-la

2. **Takeshi Yamamoto** - Tokyo, Japan
   - Email: takeshi.yamamoto@test.com
   - Store: akihabara-bey-shop

3. **Oliver Thompson** - London, UK
   - Email: oliver.thompson@test.com
   - Store: london-spin-arena

4. **Carlos Silva** - São Paulo, Brazil
   - Email: carlos.silva@test.com
   - Store: sao-paulo-bey-champions

5. **Wei Zhang** - Singapore
   - Email: wei.zhang@test.com
   - Store: marina-bay-bladers

### Option 3: Automated (Requires Script Update)

1. Users must first sign up at `/sign-up` with their test credentials
2. Get their Stack User IDs from Stack Dashboard
3. Update `seed-stores.js` with real user IDs
4. Run: `node web/seed-stores.js`

## 📂 Files Created

- `test-seed-data.json` - Full JSON data with all details
- `seed-stores.js` - Seeding script (needs user IDs)
- `TEST_STORES_README.md` - This file

## ⚠️ Important Notes

- All passwords are `TestPass123!`
- These are **TEST ACCOUNTS ONLY** - never use in production
- Each store gets a random 4-digit PIN on creation
- Store slugs are URL-friendly versions of store names
