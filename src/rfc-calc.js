(function(w) {

  var rfcCalcId = 'rfc-calc'; // ID dom-элемента, куда будем встраиваться

  // параметры для отправления лида
  var N1_API_PARAMS = {
    // url: 'https://api.n1.ru/api/v1/leads/',
    url: 'https://nskan.ru',
    baseParams: {
      type: 'refinans',
      platform: 'tilda',
      place_form: 'calc',
      city: { id: 89026 },
      region: { id: 1054 }
    }
  }

  // имена параметров в QUERY запросе
  var QUERY_PARAMS_NAMES = {
    currentRate: 'rate',
    currentPayment: 'payment',
    startDate: 'date',
    mortgageYears: 'years',
    refinanceRate: 'rate_now',
    hideRefinanceChange: 'offchange'
  }

  /* СТАРТОВЫЕ ПАРАМЕТРЫ */
  var START_PARAMS = {
    currentRate: 13,
    currentPayment: 30000,
    refinancePercent: 9,
    mortgageYears: 15
  };

  // если не будет jQ - инджектим с данного урл
  var CDN_JQUERY = "https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js";

  /* ЛОГИЧЕСКИЕ КОНСТАНТЫ */
  var DISABLED_REFINANCE_LAST_MONTH = 24 // Запретить расчет, если до конца текущей ипотеки менее стольки месяцев
  var TABLE_PAYMENT_STEP = 1000;
  var MAX_YEARS_INTERVAL = {
    min: 5,
    max: 30
  };

  var maxInDataPicker = new Date();
  maxInDataPicker.setMonth(maxInDataPicker.getMonth() - 1);

  // обозначения DOM элементов нашего калькулятора
  var DOM_RFC_ID = {
    creditPercentAmount: 'creditPercentAmount',
    divPayingNow: 'divPayingNow',
    divRefinancebuy: 'divRefinancebuy',
    nextStepArea: 'nextStepArea',
    alertText: 'alertText',
    ofertaFrame: 'ofertaFrame'
  }

  var HIDDEN_CLASS = 'rfc-hidden';

  var ALERT_TEXTS = {
    alreadyDone: 'Эм... дак вы должны уже выплатить ипотеку. Давайте лучше возьмем вам вторую на выгодных условиях!',
    noLogic: 'До конца ипотеки осталось менее двух лет. Рефинансировать уже нет смысла'
  }

  var FINAL_TEXT = 'Спасибо! Ваша заявка поступила к нам, мы перезвоним вам в ближайшее время!';

  var MONTH_NAMES_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сент', 'Окт', 'Ноя', 'Дек'];
  var MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  /* ОБЪЯВЛЕНИЕ РАСЧЕТНЫХ ПЕРЕМЕННЫХ */
  var $DOM = {};
  var sendedParams = {};

  initCalculator();

  function initCalculator() {
    setTimeout(function() {
      prepareStylesAndScripts(function() {
        insertHtml();
        bindDOMElements();
        bindDOMEvents();
        startingSettings();
      });
    });
  }

  function insertHtml() {
    // $('<div data-rfc-id="' + DOM_RFC_ID.divPayingNow + '">').appendTo('#' + rfcCalcId);
    // $('<div data-rfc-id="' + DOM_RFC_ID.alertText + '" style="display:none;"></div><div data-rfc-id="' + DOM_RFC_ID.nextStepArea + '" style="display:none;"><div data-rfc-id="' + DOM_RFC_ID.divRefinancebuy + '"></div>').appendTo('#' + rfcCalcId);



    $('#' + rfcCalcId).html("$INJECT_template");
    $DOM.divPayingNow = getElementByRfcId(DOM_RFC_ID.divPayingNow);
    $DOM.divRefinancebuy = getElementByRfcId(DOM_RFC_ID.divRefinancebuy);
    $DOM.nextStepArea = getElementByRfcId(DOM_RFC_ID.nextStepArea);
    $DOM.alertText = getElementByRfcId(DOM_RFC_ID.alertText);

    appendOferta();


    // debugger
    $("[data-rfc-id='input:phone']").mask("+7-999-999-99-99");

  }

  function bindDOMElements() {
    $DOM.mainArea = $('#' + rfcCalcId);
    $DOM.percentInput = getElementByRfcId("rfc-percent");
    $DOM.monthlyFeeInput = getElementByRfcId("rfc-monthlyFee");
    $DOM.startMortgageInput = getElementByRfcId("rfc-startMortgage");
    $DOM.yearsInput = getElementByRfcId("rfc-years");
    $DOM.balanceOfTheLoanLabel = $("#rfc-balanceOfTheLoan");
    $DOM.balanceOfTheInterestLabel = $("#rfc-balanceOfTheInterest");
    $DOM.newPercentInput = getElementByRfcId('rfc-newPercentInput');
    $DOM.noCheating = $('#rfc-noCheating');
    $DOM.refinanceDiv = getElementByRfcId('rfc-refinanceDiv');
    $DOM.checkboxForm = getElementByRfcId('form:checkbox');
    $DOM.sendLeadButton = getElementByRfcId('sendLeadButton');
    $DOM.leadFormInputPhone = getElementByRfcId('input:phone');
    $DOM.leadFormInputMail = getElementByRfcId('input:mail');

  }

  function bindDOMEvents() {
    $DOM.percentInput.on('keyup', onDataChange);
    $DOM.monthlyFeeInput.on('keyup', onDataChange);
    $DOM.startMortgageInput.on('focusout', onDataChange);
    $DOM.yearsInput.on('keyup', onDataChange);

    $DOM.newPercentInput.on('keyup', tableСalculation);
    $DOM.newPercentInput.on('change', tableСalculation);


    $DOM.leadFormInputPhone.on('change', checkLeadData);
    $DOM.leadFormInputMail.on('change', checkLeadData);


    $DOM.checkboxForm.on('change', checkLeadData);

    $DOM.sendLeadButton.on('click', function() {
      if ($(this).attr('disabled')) return;

      $(this).val('Отправляем...').attr('disabled', 'disabled');

      sendLeadRequest();
    });
  }

  function checkLeadData() {
    if ($DOM.checkboxForm.prop('checked') && $DOM.leadFormInputPhone.val().length > 0 && $DOM.leadFormInputMail.val().length > 0) {
      $DOM.sendLeadButton.removeAttr('disabled');
    } else {
      $DOM.sendLeadButton.attr('disabled', 'disabled');
    }
  }

  function hideNextStepArea() {
    $DOM.nextStepArea.hide();
    // debugger
  }

  function showNextStepArea() {
    // debugger
    $DOM.nextStepArea.show();
    hideAlertText();
  }

  function getElementByRfcId(name) {
    return $('[data-rfc-id="' + name + '"]');
  }

  function displayAlertText(text) {
    $DOM.alertText.show().html(text);
  }

  function hideAlertText() {
    $DOM.alertText.hide();
  }

  function onDataChange() {

    if (!checkInputs()) {
      return hideNextStepArea();
    }
    var monthDiff = getDiffBetweenDateAndNow($DOM.startMortgageInput.val()) - $DOM.yearsInput.val() * 12;

    if (monthDiff + DISABLED_REFINANCE_LAST_MONTH > 0) {
      if (monthDiff > 0) {
        displayAlertText(ALERT_TEXTS.alreadyDone);
      } else {
        displayAlertText(ALERT_TEXTS.noLogic);
      }

      return hideNextStepArea();
    }

    sendedParams.startMortgage = DATA_OPERATION.getDateForRequest($DOM.startMortgageInput.val())


    showNextStepArea();
    setTextIntoBalanceIntoDivPayingNow();
  }

  function startingSettings() {
    setInputParameters();
    // document.getElementById('rfc-newPercentInput').disabled = true;

    REFINANCE_PERCENT = ENV.getUrlParamFloat(QUERY_PARAMS_NAMES.refinanceRate) || parseFloat($DOM.mainArea.attr('data-refinance-percent')) || START_PARAMS.refinancePercent;
    HIDE_REFINANCE_PERSENT = ENV.getUrlParameter(QUERY_PARAMS_NAMES.hideRefinanceChange) || $DOM.mainArea.attr('data-hide-refinance-persent');
    $DOM.newPercentInput.val(REFINANCE_PERCENT);



    if (HIDE_REFINANCE_PERSENT === "1") {
      $DOM.refinanceDiv.hide();
      getElementByRfcId('rfc-newPercentSpan').html(REFINANCE_PERCENT);
      getElementByRfcId('rfc-newPercentToSpan').removeClass(HIDDEN_CLASS);
    }
  };

  function addInPayingNow(element) {
    $DOM.divPayingNow.append(element);
  };


  function appendOferta(argument) {
    var doc = getElementByRfcId(DOM_RFC_ID.ofertaFrame).get(0).contentWindow.document;
    doc.open();
    doc.write('$INJECT_oferta');
    doc.close();
  }

  function addInRefinancebuy(element) {
    $DOM.divRefinancebuy.append(element);
  };


  /* FUNCTIONS */
  var principalTotalInterestDebt = 0;
  var differenceForRefinancebuy = 1;
  var monthlyFeeArray = new Array(7);
  var mainTotalDebt = 0;
  var totalDebt = 0;
  var saving = [];
  var principalInterestDebt = 0;
  var creditBody, creditPercentes;

  function setTextIntoBalanceIntoDivPayingNow() {
    $('#rfc-balanceOfTheLoanText').html("Остаток по кредиту");
    creditBody = parseInt(causeCalculating(0, 0));
    creditPercentes = parseInt(causeCalculating(1, 0));

    sendedParams.creditBody = creditBody;
    sendedParams.creditPercentes = creditPercentes;

    $DOM.balanceOfTheLoanLabel.html(splitIntoThousands(creditBody));
    $DOM.balanceOfTheInterestLabel.html("+ проценты " + splitIntoThousands(creditPercentes));
    if (checkInputs()) { tableСalculation(); }
  };

  function tableСalculation() {
    if (Number($DOM.newPercentInput.val()) < Number($DOM.percentInput.val()) && $DOM.newPercentInput.val() != "" && Number($DOM.newPercentInput.val()) > 0) {
      $DOM.noCheating.css({ 'display': 'none' });
      $('.rfc-table--desktop').css({ 'display': 'block' });
      $('.rfc-table--mobile').css({ 'display': 'block' });
      setParametersOfTableTR2();
      setParametersOfTableTR1();
      setParametersOfTableTR3();
    } else {
      $('.rfc-table--desktop').css({ 'display': 'none' });
      $('.rfc-table--mobile').css({ 'display': 'none' });
      $DOM.noCheating.css({ 'display': 'block' });
    }
  };

  function setMonthlyFeeArray() {
    monthlyFeeArray[1] = monthlyFeeArray[0] + Math.floor((monthlyFeeArray[3] - monthlyFeeArray[0]) / 3);
    monthlyFeeArray[2] = monthlyFeeArray[0] + Math.floor((monthlyFeeArray[3] - monthlyFeeArray[0]) / 3 * 2);
    monthlyFeeArray[4] = monthlyFeeArray[3] * 1.25;
    monthlyFeeArray[5] = monthlyFeeArray[3] * 1.5;
    monthlyFeeArray[6] = monthlyFeeArray[3] * 2;

    for (var i = 1; i < monthlyFeeArray.length; i++) {
      monthlyFeeArray[i] = roundingThousands(monthlyFeeArray[i], 2);
    }
  };

  function setParametersOfTableTR1() {
    for (i = 0; i < monthlyFeeArray.length; i++) {
      var tdId = "rfc-td1";
      tdId += i + 1;
      $('[data-cell-id="' + tdId + '"]').html(splitIntoThousands(monthlyFeeArray[i]));
    };
  };

  function setParametersOfTableTR2() {
    monthlyFeeArray[3] = Number($DOM.monthlyFeeInput.val());
    var theMaturityDateOfTheMortgage = new Array(7);
    var temp = 0;
    var step = TABLE_PAYMENT_STEP;
    while (true) {
      theMaturityDateOfTheMortgage[0] = causeCalculating(2, monthlyFeeArray[3] - step);
      temp = principalTotalInterestDebt - principalInterestDebt;
      if (temp > 0) { step += TABLE_PAYMENT_STEP; } else { break };
    };
    monthlyFeeArray[0] = monthlyFeeArray[3] - step + TABLE_PAYMENT_STEP;
    monthlyFeeArray[0] = roundingThousands(monthlyFeeArray[0], 1);
    setMonthlyFeeArray();

    for (var i = 0; i < theMaturityDateOfTheMortgage.length; i++) {
      theMaturityDateOfTheMortgage[i] = causeCalculating(2, monthlyFeeArray[i]);

      if (!isNaN(mainTotalDebt - totalDebt)) {} else {
        var antiInfinity = 0;
        while (isNaN(mainTotalDebt - totalDebt)) {
          antiInfinity += 1;
          monthlyFeeArray[6] += TABLE_PAYMENT_STEP;
          theMaturityDateOfTheMortgage[6] = causeCalculating(2, monthlyFeeArray[i]);
          if (antiInfinity == 20) { break };
        }
      };

      saving[i] = principalTotalInterestDebt - principalInterestDebt;
    };

    for (i = 0; i < theMaturityDateOfTheMortgage.length; i++) {
      var tdId = "rfc-td2";
      tdId += i + 1;
      $('[data-cell-id="' + tdId + '"]').html(theMaturityDateOfTheMortgage[i]);
    };

  };

  function setParametersOfTableTR3() {
    for (i = 0; i < monthlyFeeArray.length; i++) {
      var tdId = "rfc-td3";
      tdId += i + 1;
      $('[data-cell-id="' + tdId + '"]').html(splitIntoThousands(Math.floor(saving[i])));
    };
  };

  function causeCalculating(causeType, o) {
    if (causeType == 0) {
      return calculating(0, 0, $DOM.percentInput.val(), $DOM.monthlyFeeInput.val(), $DOM.yearsInput.val(), $DOM.startMortgageInput.val());
    } else if (causeType == 1) {
      return calculating(1, 0, $DOM.percentInput.val(), $DOM.monthlyFeeInput.val(), $DOM.yearsInput.val(), $DOM.startMortgageInput.val());
    } else if (causeType == 2) {
      return calculating(2, differenceForRefinancebuy, $DOM.newPercentInput.val(), o, 0, $DOM.startMortgageInput.val());
    }
  };




  function getDiffBetweenDateAndNow(date) {
    return DATA_OPERATION.getDateMonthNumberFromStart() - DATA_OPERATION.getDateMonthNumberFromStart(date);
  }

  var differenceTemp = 0;

  function calculating(whatReturn, inS, percent, inMonthlyFee, inYears, startMortgage) {
    if (!checkInputs()) return;

    var P = Number(percent) / 12 / 100;
    var monthlyFee = Number(inMonthlyFee);
    if (inS == 0) {
      var N = inYears * 12;
      var S = monthlyFee / (P + P / (Math.pow(1 + P, N) - 1));
      S = Math.round(S);
    } else {
      var S = Number(inS);
      var a = P / (monthlyFee / S - P) + 1;
      var b = 1 + P;
      var N = Math.ceil(MATH.logs((P / (monthlyFee / S - P) + 1), 1 + P));
    };

    function calcOverFee(creditAmount, creditPeriod, monthlyFee) {
      var X = monthlyFee; // ежемесячный платеж
      var NN = creditPeriod; // период кредитования
      var overFee = X * NN - creditAmount;
      return overFee;
    };

    principalInterestDebt = calcOverFee(S, N, monthlyFee);

    var date = new Date();

    var currentMonthFromStart = DATA_OPERATION.getDateMonthNumberFromStart();
    var differenceDate = currentMonthFromStart - DATA_OPERATION.getDateMonthNumberFromStart(startMortgage);

    var interest = [];
    var loanDebt = [];
    var arrayS = [];
    arrayS[0] = S;
    var interestSum = 0,
      loanDebtSum = 0;
    var balanceOfTheInterest = 0;
    for (var i = 0; i < N; i++) {
      interest[i] = arrayS[i] * P;
      loanDebt[i] = monthlyFee - interest[i];
      arrayS[i + 1] = arrayS[i] - loanDebt[i];
      interestSum += interest[i];
      loanDebtSum += loanDebt[i];
      if (i == differenceDate) {
        balanceOfTheInterest = interestSum;
      };
    };

    function getBalanceOfTheLoan() {
      function theMaturityDateOfTheMortgage() {
        var dateEndYear = Math.floor(((date.getMonth() + 1 + (date.getFullYear() * 12)) + N) / 12);
        var dateEndMonth = Math.floor(((date.getMonth() + 1 + (date.getFullYear() * 12)) + N) % 12);
        var theMaturityDateOfTheMortgage = DATA_OPERATION.getStringMonth(dateEndMonth) + " " + dateEndYear;
        return theMaturityDateOfTheMortgage;
      };
      if (whatReturn == 0) {
        mainTotalDebt = arrayS[differenceDate] + (interestSum - balanceOfTheInterest);
        principalTotalInterestDebt = (interestSum - balanceOfTheInterest);
        differenceForRefinancebuy = arrayS[differenceDate];
        differenceTemp = arrayS[differenceDate];

        return arrayS[differenceDate];
      } else {
        if (whatReturn == 1) {
          return (interestSum - balanceOfTheInterest);
        } else {
          totalDebt = differenceTemp + (interestSum - balanceOfTheInterest);
          return theMaturityDateOfTheMortgage()
        };
      };
    };

    return getBalanceOfTheLoan();

  };





  function splitIntoThousands(number) {
    number = number - (number % 1);
    number = String(number);
    number = number.replace(/\B(?=(?:\d{3})+(?!\d))/g, ' ');
    number += " ₽"
    return number;
  }

  function prepareStylesAndScripts(callback) {
    if (window.jQuery) {
      afterJqueryLoaded(callback)
    } else {
      ENV.loadScript(CDN_JQUERY, function() {
        afterJqueryLoaded(callback)
      });
    }
  }

  function afterJqueryLoaded(callback) {
    includeDatepicker();
    includeMaskedInputs();
    callback();
    $('body').append('<style>$INJECT_style</style>');
  }

  function checkInputs() {

    var data = {
      years: parseInt($DOM.yearsInput.val()),
      currentPayment: parseInt($DOM.monthlyFeeInput.val()),
    }

    // выйти если год указан неверно
    if (!data.years || data.years < MAX_YEARS_INTERVAL.min || data.years > MAX_YEARS_INTERVAL.max) {
      return
    }

    if (!$DOM.percentInput.val() || !$DOM.monthlyFeeInput.val()) {
      return
    }

    if (!data.currentPayment) {
      return;
    }

    if (!$DOM.startMortgageInput.val()) {
      return;
    }

    return true;
  };


  // "умная"" сортировка до тысяч
  function roundingThousands(number, where) {
    var tempNumber = number;
    tempNumber %= 1000;
    if (where == 0) {
      return (number - tempNumber)
    } else {
      if (where == 1) {
        return (number - tempNumber + 1000);
      } else {
        if (tempNumber < 250) {
          return (number - tempNumber);
        }
        if (tempNumber >= 250 && tempNumber < 750) {
          return (number - tempNumber + 500);
        }
        if (tempNumber >= 750) {
          return (number - tempNumber + 1000);
        }
      }
    }
  };

  function sendLeadRequest() {

    var data = {};

    for (var i in N1_API_PARAMS.baseParams) {
      data[i] = N1_API_PARAMS.baseParams[i];
    }

    data.phone = getElementByRfcId('input:phone').val();
    data.email = getElementByRfcId('input:mail').val();

    data.params = {
      refinans_rate: parseFloat($DOM.percentInput.val()), // текущая процентная ставка
      refinans_payment: parseFloat($DOM.monthlyFeeInput.val()), // текущий ежемесячный платеж
      refinans_date: sendedParams.startMortgage, // месяц и год когда взял ипотеку
      refinans_period: parseFloat($DOM.yearsInput.val()), // период на какой взял ипотеку
      refinans_rate_now: parseFloat($DOM.newPercentInput.val()), // ставка после рефинансирования
      refinans_price: sendedParams.creditBody, // остаток по оплате
      refinans_percent: sendedParams.creditPercentes // проценты по оплате
    }

    ENV.postRequest(N1_API_PARAMS.url, data, function(q, w, e) {
      getElementByRfcId('finalArea').html('<div class="rfc-finalAreaText">'+FINAL_TEXT+'</div>');
    });
  }

  function setInputParameters() {
    $DOM.percentInput.val(ENV.getUrlParamFloat(QUERY_PARAMS_NAMES.currentRate) || START_PARAMS.currentRate);
    $DOM.monthlyFeeInput.val(ENV.getUrlParamFloat(QUERY_PARAMS_NAMES.currentPayment) || START_PARAMS.currentPayment);
    $DOM.yearsInput.val(ENV.getUrlParamFloat(QUERY_PARAMS_NAMES.mortgageYears) || START_PARAMS.mortgageYears);
  };

  function includeDatepicker() {
    //вставить стили датапикера
    $('body').append('<style>$INJECT_lib_datepicker_css</style>');

    //вставить скрипты датапикера
    $INJECT_lib_datepicker_js;
  }

  function includeMaskedInputs() {
    $INJECT_lib_masked;
  }


  var MATH = {
    logs: function(n, base) {
      return Math.log(n) / (base ? Math.log(base) : 1);
    }
  };

  var ENV = {
    getUrlParameter: function(name) {
      name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
      var results = regex.exec(location.search);
      return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    },
    getUrlParamFloat: function(name) {
      var param = ENV.getUrlParameter(name);
      if (!param) return;

      return parseFloat(param.replace(',', '.'));
    },
    postRequest: function(url, obj, callback) {
      $.ajax({
        type: "POST",
        url: url,
        data: obj,
        complete: callback
      });
    },
    loadScript: function(url, callback) {
      var script = document.createElement("script")
      script.type = "text/javascript";

      if (script.readyState) { //IE
        script.onreadystatechange = function() {
          if (script.readyState == "loaded" ||
            script.readyState == "complete") {
            script.onreadystatechange = null;
            callback();
          }
        };
      } else { //Others
        script.onload = function() {
          callback();
        };
      };

      script.src = url;
      document.getElementsByTagName("head")[0].appendChild(script);
    }
  }




  var DATA_OPERATION = (function() {
    var self = {};

    self.getDateForRequest = function(val) {
      var month = self.getNumberMonthOfString(val) + 1;
      month = (month < 10) ? '0' + month : month;
      return '' + month + '.' + self.getYearOfString(val);
    };

    self.getStringMonth = function(numberMonth) {
      return MONTH_NAMES_SHORT[numberMonth];
    };

    self.getNumberMonthOfString = function(stringDate) {
      return MONTH_NAMES.indexOf(stringDate.replace(/[\d ]/g, ''));
    }

    self.getYearOfString = function(stringDate) {
      return Number(stringDate.replace(/[\D ]/g, ''));
    }

    self.getDateMonthNumberFromStart = function(date) {
      if (!date) {
        var d = new Date();
        return d.getFullYear() * 12 + d.getMonth();
      } else {
        return (self.getYearOfString(date) * 12 + self.getNumberMonthOfString(date) + 1);
      }
    }

    return self;
  })();


})(window);