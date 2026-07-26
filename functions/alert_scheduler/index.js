const catalyst = require('zcatalyst-sdk-node');

module.exports = async (cronDetails, context) => {
    try {
        const app = catalyst.initialize(context);
        const zcql = app.zcql();
        const datastore = app.datastore();
        
        console.log("Job Scheduler Executing: Checking for Emerging Crime Spikes...");
        
        // 1. Query the live ActSectionAssociation table to find the most frequent section currently
        const qSection = "SELECT ActSectionAssociation.SectionID, COUNT(ActSectionAssociation.ROWID) FROM ActSectionAssociation WHERE ActSectionAssociation.SectionOrderID = 1 GROUP BY ActSectionAssociation.SectionID ORDER BY COUNT(ActSectionAssociation.ROWID) DESC";
        const res = await zcql.executeZCQLQuery(qSection);
        
        if (res && res.length > 0) {
            const topRow = res[0].ActSectionAssociation || res[0];
            let count = 0;
            // Parse the dynamic COUNT alias from ZCQL
            for (let k in topRow) {
                if (k.toUpperCase().includes('COUNT')) count = parseInt(topRow[k], 10);
            }
            const section = topRow.SectionID || "BNS-305";
            
            // Heuristic threshold: if a single section has >= 2 active FIRs in the current window, flag it as a spike
            if (count >= 2) {
                const table = datastore.table('system_alerts');
                await table.insertRow({
                    alert_uid: "ALRT-JOB-" + Date.now(),
                    title: "EMERGING TREND ALERT",
                    message: `Automated detection: Spike in ${section} cases (${count} active incidents). Immediate sector deployment recommended.`,
                    severity: "CRITICAL",
                    district_name: "Bengaluru Urban",
                    bns_primary_section: section,
                    is_active: true,
                    record_created_datetime: new Date().toISOString().replace('T', ' ').substring(0, 19)
                });
                console.log(`Spike detected in ${section}! Alert pushed to system_alerts.`);
            } else {
                console.log("No anomalies detected during this execution window.");
            }
        }
        
        // Mandatory for Catalyst Jobs
        context.closeWithSuccess();
    } catch (err) {
        console.error("Job Error:", err);
        context.closeWithFailure();
    }
};
