// A realistic 12-month treasurer ledger for a university student organization.
// Designed so the analysis surfaces genuine talking points for a demo:
// dues revenue is flat while event spending climbs, fundraising is seasonal,
// and the cash balance erodes over the year (a shrinking runway).
export const SAMPLE_ORG_NAME = "Lone Star Student Union";
export const SAMPLE_SECTOR = "University student organization (nonprofit)";

export const SAMPLE_CSV = `month,member_count,dues_revenue,event_revenue,fundraising_revenue,sponsorship_revenue,total_revenue,event_expenses,supplies_expenses,travel_expenses,operating_expenses,total_expenses,cash_and_equivalents
2025-07,118,5900,0,0,1500,7400,1200,400,0,900,2500,18450
2025-08,124,6200,1800,0,2000,10000,3400,650,0,950,5000,23450
2025-09,131,6550,3200,1200,2500,13450,6100,820,1400,1000,9320,27580
2025-10,129,6450,2400,4800,1000,14650,5800,910,900,1050,8660,33570
2025-11,127,6350,1500,6200,500,14550,4900,780,1600,1050,8330,39790
2025-12,125,6250,900,2100,0,9250,3200,540,2400,1100,7240,41800
2026-01,121,6050,2600,0,1500,10150,5400,690,800,1100,7990,43960
2026-02,119,5950,3100,1800,2000,12850,7200,950,2100,1150,11400,45410
2026-03,116,5800,2900,3400,1000,13100,8100,1040,3200,1150,13490,45020
2026-04,113,5650,4200,2600,500,12950,9400,1180,2800,1200,14580,43390
2026-05,108,5400,1900,900,0,8200,6800,720,1600,1200,10320,41270
2026-06,104,5200,600,0,0,5800,2400,480,400,1250,4530,42540`;

export function createSampleFile(): File {
  return new File([SAMPLE_CSV], "Lone Star Student Union - FY25-26 Ledger.csv", { type: "text/csv" });
}
