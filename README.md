# Influencer Campaign ROI Dashboard

An interactive dashboard for evaluating influencer marketing campaigns across platforms, campaigns, products and creators. It joins influencer, post, order-tracking and payout data to report revenue, spend, ROAS and engagement, with filters, custom charts and CSV/PDF export.

**Live demo:** https://akarshgarg285.github.io/Influencer-Tracking-Dashboard/ (click **Use Sample Data** to explore)

## Features

- KPI cards for total orders, revenue, spend (influencer payouts) and ROAS
- Charts: revenue and ROAS by platform, revenue by product, campaign ROAS, top 5 influencers by revenue, bottom 5 by ROAS
- Filters by platform, category, product and campaign
- Influencer performance table
- Custom chart builder (choose the grouping, metric and sum/average)
- Export the influencer performance table to CSV and the dashboard to PDF

## Tech stack

React 19 + TypeScript, Vite, Material UI, Recharts, SheetJS (xlsx), jsPDF + html2canvas.

## Run it locally

Requires [Node.js](https://nodejs.org/) 18 or later.

```bash
git clone https://github.com/akarshgarg285/Influencer-Tracking-Dashboard.git
cd Influencer-Tracking-Dashboard
npm install
npm run dev
```

Then open http://localhost:3000. No API key is needed.

To build a static version: `npm run build` (output in `dist/`).

## Using your own data

Click **Upload Your File (.xlsx)** and upload an Excel workbook with these four sheets. Column names must match exactly.

| Sheet | Columns |
|---|---|
| `influencers` | `ID`, `Name`, `Category`, `Gender`, `Follower_Count`, `Platform` |
| `posts` | `Influencer_ID`, `Platform`, `Date`, `URL`, `Caption`, `Reach`, `Likes`, `Comments` |
| `tracking_data` | `Source`, `Campaign`, `Influencer_ID`, `User_ID`, `Product`, `Date`, `Orders`, `Revenue` |
| `payouts` | `Influencer_ID`, `Basis`, `Rate`, `Orders`, `Total_Payout` |

## Metrics

- **ROAS** = revenue / total payout
- **Engagement rate** = (likes + comments) / total payout, i.e. engagement earned per unit of spend

## Deployment

Every push to `main` builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`.
