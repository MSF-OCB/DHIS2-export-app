/**
 * Created by hisp on 2/12/15.
 */
msfReportsApp.directive('calendar', function() {
    return {
        require: 'ngModel',
        link: function(scope, el, attr, ngModel) {
            $(el).datepicker({
                dateFormat: 'yy-mm-dd',
                onSelect: function(dateText) {
                    scope.$apply(function() {
                        ngModel.$setViewValue(dateText);
                    });
                }
            });
        }
    };
});
msfReportsApp
    .controller('exportappcontroller', function($rootScope,
        $scope,
        $timeout,
        MetadataService) {


        //PSI
        //const SQLVIEW_TEI_PS =  "FcXYoEGIQIR";
        // const SQLVIEW_TEI_ATTR = "WMIMrJEYUxl";
        var def = $.Deferred();
        //MSF
        const SQLVIEW_TEI_PS = "Ysi6iyNK1Ha";
        const SQLVIEW_TEI_ATTR = "GoPX942y3eV";
        


        jQuery(document).ready(function() {
            hideLoad();
        })
        $timeout(function() {
            $scope.date = {};
            $scope.date.startDate = new Date();
            $scope.date.endDate = new Date();
        }, 0);

        //initially load tree
        selection.load();

        getAllPrograms();
        // Listen for OU changes
        selection.setListenerFunction(function() {
            $scope.selectedOrgUnitUid = selection.getSelected();
            loadPrograms();
        }, false);

        loadPrograms = function() {
            MetadataService.getOrgUnit($scope.selectedOrgUnitUid).then(function(orgUnit) {
                $timeout(function() {
                    $scope.selectedOrgUnit = orgUnit;
                });
            });
        }

        function download(text, name, type) {
            var a = document.createElement("a");
            var file = new Blob([text], {
                type: type
            });
            a.href = URL.createObjectURL(file);
            a.download = name;
            a.click();
        }

        $scope.selectedProgram = {};

        function getAllPrograms() {
            MetadataService.getAllPrograms().then(function(prog) {
                $scope.allPrograms = prog.programs;
                $scope.programs = [];
                for (var i = 0; i < prog.programs.length; i++) {
                    if (prog.programs[i].withoutRegistration == false) {
                        $scope.programs.push(prog.programs[i]);
                    }
                }
            });
        }


        var psArray = [];



        $scope.loadProgramStages = function(response) {
            psArray = [];
            for (var i = 0; i < response.programStages.length; i++) {
                psArray[response.programStages[i].id] = response.programStages[i].name;
            }
            $scope.program = response;
            document.getElementById('loader').style.display = "block";
            document.getElementById('loaderdata').innerHTML = "Please wait, loading data!";
            getOptionName();
            getOptionName2();
        };

        $scope.updateStartDate = function(startdate) {
            var date = startdate;
            var output = date.replace(/(\d\d)\/(\d\d)\/(\d{4})/, "$3-$1-$2");
            $scope.startdateSelected = output;
            //  alert("$scope.startdateSelected---"+$scope.startdateSelected);
        };

        $scope.updateEndDate = function(enddate) {
            var date = enddate;
            var output = date.replace(/(\d\d)\/(\d\d)\/(\d{4})/, "$3-$1-$2");
            $scope.enddateSelected = output;
            //  alert("$scope.enddateSelected---"+ $scope.enddateSelected);
        };

        /*
        this function (fnExcelReports) will be removed if the function fnExcelReport below works
        */
        $scope.fnExcelReports = function() {

            var blob = new Blob([document.getElementById('divId').innerHTML], {
                type: 'text/plain;charset=utf-8'
            });
            saveAs(blob, "Report.xls");

        };

        /* code to Export t Excel using from the HTML table: YK
       * Export to Xlsx
       */
        $scope.fnExcelReport = function() {
            var wb = XLSX.utils.table_to_book(document.getElementById('divId'));
            XLSX.writeFile(wb, "export.xlsx");
        };

        var jsonData = {
            trackedEntityInstances: [],
            enrollments: [],
            events: []
        };

        var gettei = function(tei) {
            var mwflag7 = false;
            var data = "";
            $.ajax({
                async: false,
                type: "GET",
                url: "../../trackedEntityInstances/" + tei + ".json?&skipPaging=true",
                success: function(response) {
                    data = response;
                }

            });

            return data;
        };

        var mapRemainingTei = function(teisTobeAdded, teiArr) {
            for (var t = 0, arr = teisTobeAdded.length; t < arr; t++) {
                var value = teiArr[teisTobeAdded[t]];
                if (!value || typeof value === undefined || value === undefined) {
                    teiArr[teisTobeAdded[t]] = true;
                    var obj = gettei(teisTobeAdded[t]);
                    if (obj == "") {} else {
                        jsonData.trackedEntityInstances.push(obj);
                    }
                }
                if (teisTobeAdded.length - 1 == t) {
                    document.getElementById('btnExportData').disabled = false;
                    $scope.jsondone = true;
                    handleLoader();
                }
            }
        };

        var totalEnrollments = 0;

        $scope.exportDataJson = function(program) {
            var mwflag1 = false,
                mwflag2 = false,
                mwflag3 = false,
                mwflag4 = false;
            var teiArr = [];
            var cEventsTei = [];
            var cEventsId = [];
            var teisTobeAdded = [];
            //document.getElementById('btnExportData').disabled = true;
            document.getElementById('loader').style.display = "block";


            var myWorkerJson4 = new Worker('worker.js');
            var url4 = '../../events.json?ou=' + $scope.selectedOrgUnit.id + '&program=' + program.id + '&lastUpdatedStartDate=' + $scope.startdateSelected + '&lastUpdatedEndDate=' + $scope.enddateSelected + '&includeDeleted=true&skipPaging=true';
            myWorkerJson4.postMessage(url4);
            myWorkerJson4.addEventListener('message', function(response4) {
                var res = (response4.data).split('&&&');
                if (url4 != res[1]) {
                    return
                }
                var obj = jQuery.parseJSON(res[0]);
                var data = obj;

                for (var j = 0, arr = obj.events.length; j < arr; j++) {
                    if (!cEventsId[obj.events[j].event] || typeof cEventsId[obj.events[j].event] === undefined || cEventsId[obj.events[j].event] === undefined) {
                        jsonData.events.push(obj.events[j]);
                        teisTobeAdded.push(obj.events[j].trackedEntityInstance);
                        cEventsTei[obj.events[j].trackedEntityInstance] = true;
                    }
                }
                mwflag3 = true;
                if (mwflag3) {
                    myWorkerJson4.terminate();
                    mapRemainingTei(teisTobeAdded, teiArr);
                }
            });

            var myWorkerJson1 = new Worker('worker.js');
            var url1 = '../../enrollments.json?ou=' + $scope.selectedOrgUnit.id + '&ouMode=DESCENDANTS&program=' + program.id + '&programStartDate=' + $scope.startdateSelected + '&programEndDate=' + $scope.enddateSelected + '&skipPaging=true';
            myWorkerJson1.postMessage(url1);
            myWorkerJson1.addEventListener('message', function(response1) {
                var res = (response1.data).split('&&&');
                if (url1 != res[1]) {
                    return
                }
                var obj = jQuery.parseJSON(res[0]);
                var data = obj;
                totalEnrollments = data.enrollments.length;
                jsonData.enrollments = data.enrollments;
                mwflag2 = true;
                if (mwflag2) {
                    myWorkerJson1.terminate();
                }
            });

            var myWorkerJson2 = new Worker('worker.js');
            var url2 = '../../trackedEntityInstances.json?ou=' + $scope.selectedOrgUnit.id + '&program=' + program.id + '&programStartDate=' + $scope.startdateSelected + '&programEndDate=' + $scope.enddateSelected + '&skipPaging=true';
            myWorkerJson2.postMessage(url2);
            myWorkerJson2.addEventListener('message', function(response2) {
                var res = (response2.data).split('&&&');
                if (url2 != res[1]) {
                    return
                }
                var obj = jQuery.parseJSON(res[0]);
                var data = obj;
                jsonData.trackedEntityInstances = obj.trackedEntityInstances;
                for (var i = 0, arr = obj.trackedEntityInstances.length; i < arr; i++) {
                    teiArr[obj.trackedEntityInstances[i].trackedEntityInstance] = true;
                }
                mwflag1 = true;
                if (mwflag1) {
                    myWorkerJson2.terminate();
                }
            });
        };

        $scope.downloadJson = function() {
            for (var g = 0; g < jsonData.trackedEntityInstances.length; g++) {
                var attrValues = jsonData.trackedEntityInstances[g].attributes;
                for (var t = 0; t < attrValues.length; t++) {
                    if (attrValues[t].attribute == "qak2Z7cCMpD" || attrValues[t].attribute == "ezNf2g94ycZ" || attrValues[t].attribute == "FzXnQEnYFa5") {
                        attrValues[t].value = "PRIVATE";
                    }
                }
            }
            //console.log(jsonData);
            download(JSON.stringify(jsonData), 'exported data_' + $scope.selectedOrgUnit.id + '_' + $scope.startdateSelected + '_to_' + $scope.enddateSelected + '.json');
        };


        function showLoad() { // alert( "inside showload method 1" );
            setTimeout(function() {


                //  document.getElementById('load').style.visibility="visible";
                //   document.getElementById('tableid').style.visibility="hidden";

            }, 1000);

            //     alert( "inside showload method 2" );
        }

        function hideLoad() {

            //  document.getElementById('load').style.visibility="hidden";
            //  document.getElementById('tableid').style.visibility="visible";


        }

        var getAjaxData = function(url) {
            return $.get(url);
        };

        var keyMap = [];
        var keyMap2 = [];
        var json = "";
        var flag = "";
        var flagCount = "";
        var programid = "";
        var optionSetArr = [];

        function isEmpty(obj) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key))
                    return false;
            }
            return true;
        }
        var pagingFlag = false;
        var page = 1;
        var enrollmentsArr = [];
        // var totalPages;
        var getEnrollments = function(keyMap, program, keyMapWithName, choise, dataArray) {
            var w3flag = false;
            if (pagingFlag) {
                page++;
                pagingFlag = false;
            }
            var myWorker3 = new Worker('worker.js');
            var url = '../../enrollments.json?ou=' + $scope.selectedOrgUnit.id + '&ouMode=DESCENDANTS&program=' + program.id + '&programStartDate=' + $scope.startdateSelected + '&programEndDate=' + $scope.enddateSelected + '&fields=trackedEntityInstance&page=' + page + '&pageSize=50';
            myWorker3.postMessage(url);
            myWorker3.addEventListener('message', function(response) {
                var res = (response.data).split('&&&');
                if (url != res[1]) {
                    return
                }
                var obj = jQuery.parseJSON(res[0]);
                var data = obj;
                //totalPages = data.pager.total;
                enrollmentsArr = [];
                for (var p = 0, arr = data.enrollments.length; p < arr; p++) {
                    enrollmentsArr[p] = data.enrollments[p].trackedEntityInstance;
                }
                w3flag = true;
                getDataValues(keyMap, program, keyMapWithName, choise, dataArray);
                if (w3flag) {
                    myWorker3.terminate();
                }
            });
        };

        var teiArray = [];
        var getOptionName = function() {
            var w4flag = false;
            var myWorker4 = new Worker('worker.js');
            var url = '../../dataElements.json?fields=id,optionSetValue,optionSet[options[name,code]]&paging=none';
            myWorker4.postMessage(url);
            myWorker4.addEventListener('message', function(response) {
                var res = (response.data).split('&&&');
                if (url != res[1]) {
                    return
                }
                var obj = jQuery.parseJSON(res[0]);
                var data = obj;
                for (var y = 0, arrL = data.dataElements.length; y < arrL; y++) {
                    if (data.dataElements[y].optionSetValue == true) {
                        for (var x = 0, arrLn = data.dataElements[y].optionSet.options.length; x < arrLn; x++) {
                            optionSetArr[data.dataElements[y].optionSet.options[x].code] = data.dataElements[y].optionSet.options[x].name;
                        }
                    }
                }
                // console.log(optionSetArr);
                w4flag = true;
                if (w4flag) {
                    myWorker4.terminate();
                    document.getElementById('loader').style.display = "block";
                    allTeiData();
                }
            });

        };

        var getOptionName2 = function() {
            var w44flag = false;
            var myWorker44 = new Worker('worker.js');
            var url = '../../trackedEntityAttributes.json?fields=id,optionSetValue,optionSet[options[name,code]]&paging=none';
            myWorker44.postMessage(url);
            myWorker44.addEventListener('message', function(response) {
                var res = (response.data).split('&&&');
                if (url != res[1]) {
                    return
                }
                var obj = jQuery.parseJSON(res[0]);
                var data = obj;
                for (var y = 0, arrL = data.trackedEntityAttributes.length; y < arrL; y++) {
                    if (data.trackedEntityAttributes[y].optionSetValue == true) {
                        for (var x = 0, arrLn = data.trackedEntityAttributes[y].optionSet.options.length; x < arrLn; x++) {
                            optionSetArr[data.trackedEntityAttributes[y].optionSet.options[x].code] = data.trackedEntityAttributes[y].optionSet.options[x].name;
                        }
                    }
                }
                // console.log(optionSetArr);
                w44flag = true;
                if (w44flag) {
                    myWorker44.terminate();
                    document.getElementById('loader').style.display = "block";
                    allTeiData();
                }
            });

        };

        var printReport = function(finalKeyMap, newRow, finalKeyMapWithName, keyMapWithName, choise) {
            for (var h = 1, arrLen3 = keyMap2.length; h < arrLen3; h++) {
                //console.log(finalKeyMap)
                if (finalKeyMap.hasOwnProperty(h) && finalKeyMap[h] != null) {
                    newRow = newRow + "<td>" + finalKeyMap[h] + "</td>";
                    finalKeyMapWithName[keyMapWithName[h]] = finalKeyMap[h];
                } else {
                    newRow = newRow + "<td></td>";
                    finalKeyMapWithName[keyMapWithName[h]] = null;
                }
            }
            if(choise == "display"){
                $('.reporttable').append(newRow + "</tr>");
            }
            else{
                return finalKeyMapWithName;
            }
        };



        var allTeiData = function() {
            var w0flag = false;
            var myWorker0 = new Worker('worker.js');
            var url = "../../trackedEntityInstances.json?ou=" + $scope.selectedOrgUnit.id + "&ouMode=DESCENDANTS&program=" + $scope.program.id + "&skipPaging=true";
            myWorker0.postMessage(url);
            myWorker0.addEventListener('message', function(response) {
                var res = (response.data).split('&&&');
                if (url != res[1]) {
                    return
                }
                var obj0 = jQuery.parseJSON(res[0]);
                var result = obj0;
                var teidata = result.trackedEntityInstances;
                for (var i = 0, len = teidata.length; i < len; i++) {
                    teiArray[teidata[i].trackedEntityInstance] = teidata[i].attributes;
                }
                // console.log(optionSetArr);
                w0flag = true;
                if (w0flag) {
                    myWorker0.terminate();
                    document.getElementById('loader').style.display = "none";
                    //  document.getElementById('loaderdata').style.display = "none";
                }
            });

        };

        var handleLoader = function() {
            if ($scope.reportdone && $scope.jsondone) {
                document.getElementById('loader').style.display = "none";
            }
        }


        $scope.reportdone = false;
        $scope.jsondone = false;

        var getTeiData = function(eventsAtrr) {
            //console.log(eventsAtrr);
            var temprMap = [];
           
            for (var r = 0, lenn = eventsAtrr.length; r < lenn; r++) {
                var valuess = eventsAtrr[r];
                var count = keyMap[valuess.attribute];
                //console.log(valuess);
                /*
                    temp Hard codes for Private fields based attribute codes in Lebanon and Embu (to be corrected on upgrade to 2.30).
                */
                if (valuess.code == "Alt_phone_number_private" || valuess.code == "Patient_name_private" || valuess.code == "Phone_number_private") {
                    var value = "PRIVATE";
                } else {
                    var value = valuess.value;
                }
                var optionValue = optionSetArr[value];
                if (typeof optionValue === undefined || optionValue === undefined) {} else {
                    var value = optionValue;
                }
                temprMap[count] = value;
            }
            //console.log(temprMap);
            return JSON.parse(JSON.stringify(temprMap));;
        };;

        var teiResponse;
        var terminateWork = false;
        var oldIndex = 0;

        var getDataValues = function(keyMap, program, keyMapWithName,choise, dataArray) {
            var tei = "";
            var w6flag = false;
            flag = enrollmentsArr.length;
            if (enrollmentsArr.length == 0) {
                w6flag = true;
            }
            var g = 0;
            var pageIndex = 0;
            if (enrollmentsArr.length == 49) {
                pageIndex = 1;
            }
            enrollmentsArr.forEach(function(element) {
                //tempMap = [];
                tei = element;
                var tempMap = [];
                var tempMapWithName = [];

                var teiattr = teiArray[tei];
                if (teiattr === undefined) {} else {
                    tempMap = getTeiData(teiattr);
                }
                var emptyRows = 0;
                var myWorker6 = new Worker('worker.js');
                var url3 = '../../events.json?trackedEntityInstance=' + tei + '&program=' + program.id + '&order=eventDate:ASC&skipPaging=true';
                // console.log(url3);
                myWorker6.postMessage(url3);
                myWorker6.addEventListener('message', function(response) {


                    var res3 = (response.data).split('&&&');
                    if (url3 != res3[1]) {
                        return
                    }
                    var obj5 = jQuery.parseJSON(res3[0]);
                    var data5 = obj5;
                    pageIndex++;

                    data5.events.forEach(function(eventElement) {
                        var finalKeyMap = [];
                        var finalKeyMapWithName = [];
                        var rowData = [];
                        //finalKeyMap = tempMap;
                        if (tempMap[4] === undefined) {
                            console.log("empty row found!");
                            emptyRows++;
                            tempMap = getTeiData(teiResponse);
                        }

                        finalKeyMap = JSON.parse(JSON.stringify(tempMap));

                       
                        //console.log(finalKeyMap);
                        var pidd = eventElement.programStage;
                        finalKeyMap[1] = psArray[pidd];
                        if (eventElement.eventDate === undefined || typeof eventElement.eventDate === undefined) {
                            finalKeyMap[2] == ""
                        } else {
                            finalKeyMap[2] = (eventElement.eventDate).split('T')[0];
                        }
                        finalKeyMap[3] = eventElement.orgUnitName;
                        
                        
                        finalKeyMapWithName["Event name"] = finalKeyMap[1];
                        finalKeyMapWithName["Event date"] = finalKeyMap[2];
                        finalKeyMapWithName["Orgunit"] = finalKeyMap[3];

                        /*Mapping the key with names YK:
                        
                        var dataKeys = finalKeyMap;
    
                        for (let key in dataKeys) {
                            finalKeyMapWithName[tempMapWithName[key]] = dataKeys[key];
                        }
                        */

                        if (finalKeyMap[1] == "First Visit") {
                            var newRow = "<tr style='background-color:#abbedf'>";
                        } else if (finalKeyMap[1] == "Follow-up Visit") {
                            var newRow = "<tr>";
                        } else if (finalKeyMap[1] == "Exit") {
                            var newRow = "<tr style='background-color:#95a3ba'>";
                        } else {
                            if (finalKeyMap[1] == program.programStages[0].name) {
                                var newRow = "<tr style='background-color:#e1f8ff'>";
                            } else {
                                var newRow = "<tr>";
                            }
                        }
                        for (var n = 0, arr = eventElement.dataValues.length; n < arr; n++) {
                            var value = eventElement.dataValues[n].value;
                            if (value == 'true') {
                                value = "Yes"
                            }
                            if (value == 'false') {
                                value = "No"
                            }
                            var optionValue = optionSetArr[value];
                            if (typeof optionValue === undefined || optionValue === undefined) {} else {
                                var value = optionValue;
                            }
                            var count2 = keyMap[pidd + '+' + eventElement.dataValues[n].dataElement];
                            finalKeyMap[count2] = value;
                            //finalKeyMapWithName[count2] = value
                        }

                        //dataArray.push(finalKeyMapWithName);
                        
                        //console.log(dataArray);
                       rowData = printReport(finalKeyMap, newRow, finalKeyMapWithName, keyMapWithName, choise);
                       dataArray.push(rowData);
                        
                     
                    });
                    w6flag = true;
                    if (w6flag) {
                        myWorker6.terminate();

                        //  document.getElementById('loader').style.display = "none";
                    }
                    if (pageIndex == 50) {
                        pagingFlag = true;
                        oldIndex = oldIndex + pageIndex;
                        getEnrollments(keyMap, program, keyMapWithName,choise,dataArray);
                    }

                    //console.log("oldIndex =" + oldIndex + " pageIndex=" + pageIndex + "emptyRows=" + emptyRows + " and total enrollments=" + totalEnrollments);
                    if ((oldIndex + pageIndex + emptyRows) === totalEnrollments) {
                        
                        terminateWork = true;
                        $scope.reportdone = true;
                        handleLoader();
                        // document.getElementById('loader').style.display = "none";
                        alert("Click ok to Download Excel file")
                       
                        if(choise == "noDisplay"){
                            /* converting array to json files for Xcell export YK:
                            */
                            /* Exporting data to Excel file */

                            /* generate a worksheet */
                            var ws = XLSX.utils.json_to_sheet(dataArray);

                            /* add to workbook */
                            var wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "data");

                            /* write workbook and force a download */
                            XLSX.writeFile(wb, "client_reports.xlsx");
                        }

                        oldIndex = 0;
                        pageIndex = 0;
                        emptyRows = 0;
                    }

                });


            });
            if (w6flag) {
                //  myWorker6.terminate();
                // document.getElementById('loader').style.display = "none";
            }
        };

        var getRows = function(row, hr, program, index, choise) {
            var w2flag = false;
            var dataArray = [];
            var url1 = '../../programs/' + program.id + '.json?fields=programStages[id,name,programStageDataElements[dataElement[id,name]]]';
            var myWorker2 = new Worker('worker.js');
            myWorker2.postMessage(url1);
            myWorker2.addEventListener('message', function(response) {
                var res1 = (response.data).split('&&&');
                if (url1 != res1[1]) {
                    return
                }
                var obj1 = jQuery.parseJSON(res1[0]);
                var data2 = obj1;
                json = data2;
                var counter = 0;

                //  for(var j=0, arrLen = data2.programStages.length;j<arrLen;j++){
                for (var j = 0, arrLen1 = data2.programStages.length; j < arrLen1; j++) {
                    // getHeaderRow(json,program, row, hr, index, j);
                    var pid = data2.programStages[j].id;
                    hr = hr + "<th colspan ='" + data2.programStages[j].programStageDataElements.length + "'>" + json.programStages[counter].name + "</th>";
                    for (var k = 0, arrL = data2.programStages[j].programStageDataElements.length; k < arrL; k++) {
                        var nameDe = data2.programStages[j].programStageDataElements[k].dataElement.name;
                        var idDe = data2.programStages[j].programStageDataElements[k].dataElement.id;
                        row = row + "<th class='rows' id='" + idDe + "'>" + nameDe + "</th>";
                        keyMap[pid + '+' + idDe] = index;
                        keyMap2[index] = pid + '+' + idDe;
                        /*
                        attaching the name of the field to the values YK:
                        */
                        keyMapWithName[index] = nameDe + " " + json.programStages[counter].name;

                        index++;
                    }
                    counter++;
                    if (counter == data2.programStages.length) {

                        if(choise == "display"){
                            $('.reporttable').append(hr + "</tr>" + row + "</tr>");
                        }
                        
                        getEnrollments(keyMap, program, keyMapWithName, choise, dataArray);
                    }
                }
                w2flag = true;
                if (w2flag) {
                    myWorker2.terminate();
                }
            });
        };
        var flagg = 0;
        $scope.isDisabled = true;
        $scope.generateReport = function(program, choise) {
            $scope.isDisabled = false;
            keyMap = [];
            keyMap2 = [];
            page = 1;
            keyMapWithName = [];
            //json = "";
            //flag = "";
            // flagCount = "";
            // programid =  "";
            programid = program.id;

            // allTeiData(program);
            $scope.exportDataJson(program);
            var w1flag = false;
            document.getElementById('loader').style.display = "block";

            var myWorker1 = new Worker('worker.js');
            $(".reporttable tbody").remove();
            $(".reporttable tbody").detach();
            var row = "<tr><th>Event Name</th><th>Event Date</th><th>Orgunit</th>";
            var json = "";
            var index = 4;
            var url = '../../programs/' + program.id + '.json?fields=programTrackedEntityAttributes';
            myWorker1.postMessage(url);
            myWorker1.addEventListener('message', function(response) {
                var res1 = (response.data).split('&&&');
                if (url != res1[1]) {
                    return
                }
                var obj = jQuery.parseJSON(res1[0]);
                var data1 = obj;
                for (var i = 0, arrayLength = data1.programTrackedEntityAttributes.length; i < arrayLength; i++) {
                    keyMap[data1.programTrackedEntityAttributes[i].trackedEntityAttribute.id] = index;
                    keyMap2[index] = data1.programTrackedEntityAttributes[i].trackedEntityAttribute.id;
                    keyMapWithName[index] = data1.programTrackedEntityAttributes[i].displayName
                    index++;
                    row = row + "<th class='rows' id='" + data1.programTrackedEntityAttributes[i].trackedEntityAttribute.id + "'>" + data1.programTrackedEntityAttributes[i].displayName + "</th>";
                }
                var hr = "<tr><th colspan='" + (data1.programTrackedEntityAttributes.length + 3) + "'>Attributes</th>";
                flagg = 1;
                getRows(row, hr, program, index, choise);
                w1flag = true;

                if (w1flag) {
                    myWorker1.terminate();
                }


            }, false);

        };
    });