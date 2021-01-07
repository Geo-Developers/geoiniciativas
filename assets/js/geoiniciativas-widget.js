var $GEO = {tab: []};

let checkIfURL = function(str){
    var expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
    var regex = new RegExp(expression);
    if (str.match(regex)) {
        return true;
      } else {
        return false;
      }
}

let getSpreadsheetTab = function(spreadsheetID, tabID){
    const spreadsheetURL = `https://spreadsheets.google.com/feeds/list/${spreadsheetID}/${tabID}/public/values?alt=json`;
    return fetch(spreadsheetURL).then(response => {
        responseCopy = response.clone()
        responseCopy.json().then(data => $GEO['tab'][tabID] = data );
        return response.json()
    });
}

let downloadTab = function(spreadsheetID, tabID){
    getSpreadsheetTab(spreadsheetID, tabID).then(data => {
        let cleanData = getGsheetsJSON(data);
        let csv = JSONtoCSV(cleanData);

        let bodyEl = document.getElementsByTagName("body")[0];
        const aNode= document.createElement('a');
        aNode.style = "display:none";
        bodyEl.appendChild(aNode)
        aNode.setAttribute("href","data:text/csv,"+     encodeURIComponent(csv)     );
        aNode.setAttribute("download", `${data.feed.title.$t}.csv`);

        aNode.click();
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
    const replacer = (key, value) => value === null ? '' : value
    const header = Object.keys(json[0])
    const csv = [
      header.join(','),
      ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    ].join('\r\n')

    return csv;
}


let getSpreedsheetMetadata = function(spreadsheetID){
    const spreadsheetURL = `https://spreadsheets.google.com/feeds/worksheets/${spreadsheetID}/public/full?alt=json`;
    return fetch(spreadsheetURL).then(response => {
        responseCopy = response.clone()
        responseCopy.json().then(data => $GEO['metadata'] = data );
        return response.json()
    });
}

let getSheetByName = function(spreadsheetID, tabName){
    return getSpreedsheetMetadata(spreadsheetID).then(data => {
        const numTabs = data.feed.openSearch$totalResults.$t;
        return new Promise(function(resolve, reject) {
            recursiveSearch(spreadsheetID, tabName, numTabs, resolve, reject);
        });
    })
}

let recursiveSearch = function(spreadsheetID, tabName, numTabs, resolve, reject, tabIDCursor = 1){
    if (tabIDCursor <= numTabs) {
        return getSpreadsheetTab(spreadsheetID, tabIDCursor).then(data => {
            if(data.feed.title.$t == tabName){
                return resolve({cells: getGsheetsJSON(data), tabID: tabIDCursor})
            }else{
                return recursiveSearch(spreadsheetID, tabName, numTabs, resolve, reject, tabIDCursor+1);
            }
        })
    }
    else {
        reject(`Tab name: ${tabName} doesn't exists, check: https://docs.google.com/spreadsheets/d/${spreadsheetID}/edit#gid=0`);
    }
}

let getQueryParam = function (str, param) {
    var rx = new RegExp("[?&]" + param + "=([^&]+).*$");
    var returnVal = str.match(rx);
    return returnVal === null ? "" : returnVal[1];
}

let findTabGID = function(tabIndex){
    const result = $GEO.metadata.feed.entry[tabIndex].link.filter(url =>  getQueryParam(url.href, 'gid') != '' );

    if(result.length > 0){
        return getQueryParam(result[0].href, "gid")
    }
    console.error(`gid not found for ${tabIndex}`)
}

const renderGeoIniciativasWidget = function(){
    document.querySelectorAll('.geoiniciativas-widget').forEach(elem => {
        getSheetByName(elem.dataset.sheetid, elem.dataset.tab).then(data => {
            const tabGID = findTabGID(data.tabID-1);

            const cells = data.cells;
            const keys = Object.keys(cells[0]);
            let tableHTML = `<table class="giw"><thead><tr>`;
            keys.forEach(key => tableHTML += `<th>${key.charAt(0).toUpperCase() + key.slice(1)}</th>`);
            tableHTML += `</tr></thead><tbody>`;

            cells.forEach(row => {
                tableHTML += '<tr>';
                for (const [key, value] of Object.entries(row)) {
                    if(checkIfURL(value)){
                        tableHTML += `<td><a href="${value}">URL</a></td>`
                    }else{
                       tableHTML += `<td>${value}</td>`
                    }
                }
                tableHTML += '</tr>';
            })

            tableHTML += `
                </tbody></table>

                <p class="geoiniciativas-links">
                    <a href="#" onclick="downloadTab('${elem.dataset.sheetid}', ${data.tabID}); return false;">
                        Descargar en CSV
                    </a>
                    |
                    <a href="https://docs.google.com/spreadsheets/d/${elem.dataset.sheetid}/edit#gid=${tabGID}">
                    Ver hoja de cálculo
                    </a>
                    |
                    <a href="https://github.com/Geo-Developers/geoiniciativas/blob/main/contribute.md">
                    Contribuir
                    </a>
                    |
                    <a href="https://geo-developers.github.io/geoiniciativas/#/widget">
                        Embeber esta tabla
                    </a>
                </p>
            `;
            elem.innerHTML = tableHTML
        }).catch(err => {
            console.error(err)
        })

    });
}
renderGeoIniciativasWidget();
