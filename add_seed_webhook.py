import re

with open('functions/get_crime_analytics/index.js', 'r', encoding='utf-8') as f:
    code = f.read()

webhook_code = """
// GENERIC SEED WEBHOOK
app.post('/api/webhook/seed', async (req, res) => {
  try {
    const datastore = res.locals.catalystApp.datastore();
    const { table, records } = req.body;
    if (!table || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }
    
    // Insert records in batches of 100
    const inserted = [];
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      const result = await datastore.table(table).insertRows(batch);
      inserted.push(...result);
    }
    
    res.status(200).json({ success: true, table, inserted_count: inserted.length });
  } catch (error) {
    console.error(Seed Webhook Error []:, error);
    res.status(500).json({ success: false, error: error.message });
  }
});
"""

code = code.replace(
    "// NEW ENDPOINTS",
    webhook_code + "\n// NEW ENDPOINTS"
)

with open('functions/get_crime_analytics/index.js', 'w', encoding='utf-8') as f:
    f.write(code)
print("Added /api/webhook/seed")
