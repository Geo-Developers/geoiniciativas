let getSpreadsheetTab = function(spreadsheetID, tabID){
    const spreadsheetURL = `https://spreadsheets.google.com/feeds/list/${spreadsheetID}/${tabID}/public/values?alt=json`;
    return fetch(spreadsheetURL).then(response => response.json());
}

let downloadTab = function(tabID){
    //GeoIniciativas
    // https://docs.google.com/spreadsheets/d/1bF4YYH7bXPSLI___zMfh3tDfSxDlWWZLkkuT5vD4zHQ/edit#gid=0
    const spreadsheetID = '1bF4YYH7bXPSLI___zMfh3tDfSxDlWWZLkkuT5vD4zHQ';
    getSpreadsheetTab(spreadsheetID, tabID).then(data => {

        let cleanData = getGsheetsJSON(data);
        let csv = JSONtoCSV(cleanData);
        return cleanData;
    });

}

let getGsheetsJSON = function(data){
    return data.feed.entry.map(elem => {
        let obj = {};
        for (var prop in elem) {
            const parts = prop.split("gsx$");
            if(parts.length > 1){
                obj[parts[1]] = elem[prop]['$t'];
            }
        }
        return obj;
    });
};

let JSONtoCSV = function(json){
    const items = json
    const replacer = (key, value) => value === null ? '' : value // specify how you want to handle null values here
    const header = Object.keys(json[0])
    const csv = [
      header.join(','), // header row first
      ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    ].join('\r\n')

    var dlAnchorElem = document.getElementById('aux');
    dlAnchorElem.setAttribute("href","data:text/csv,"+     encodeURIComponent(csv)     );
    dlAnchorElem.setAttribute("download", "blogs.csv");

    dlAnchorElem.click();

    return csv;
}
