(function(w) {

  var rfcCalcId = 'rfc-calc'; // ID dom-элемента, куда будем встраиваться

  // параметры для отправления лида
  var N1_API_PARAMS = {
    url: 'https://api.n1.ru/api/v1/leads/',
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
  var CDN_JQUERY = "https://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js";

  /* ЛОГИЧЕСКИЕ КОНСТАНТЫ */
  var DISABLED_REFINANCE_LAST_MONTH = 24 // Запретить расчет, если до конца текущей ипотеки менее стольки месяцев
  var TABLE_PAYMENT_STEP = 1000;
  var VALIDATEION_FIELDS = {
    yearsInterval: {
      min: 5,
      max: 30
    },
    currentPaymentMin: 5000
  }

  var maxInDataPicker = new Date();
  maxInDataPicker.setMonth(maxInDataPicker.getMonth() - 12);

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
  var MONTH_NAMES_PARENT_OBJ = {
    'Янв': 'январе',
    'Фев': 'феврале',
    'Мар': 'марте',
    'Апр': 'апреле',
    'Май': 'мае',
    'Июн': 'июне',
    'Июл': 'июле',
    'Авг': 'августе',
    'Сент': 'сентябре',
    'Окт': 'октябре',
    'Ноя': 'ноябре',
    'Дек': 'декабре',
  };

  /* ОБЪЯВЛЕНИЕ РАСЧЕТНЫХ ПЕРЕМЕННЫХ */
  var $DOM = {},
    calculationsParams = {};

  var CURRENT_DATE = new Date();
  var HIDDEN_COLS = []

  initCalculator();

  function initCalculator() {
    setTimeout(function() {
      prepareStylesAndScripts(function() {
        insertHtml();
        bindDOMElements();
        bindDOMEvents();
        startingSettings();
        includeDatepicker();
      });
    });
  }

  function insertHtml() {
    $('#' + rfcCalcId).html("$INJECT_template");
    $DOM.divPayingNow = getElementByRfcId(DOM_RFC_ID.divPayingNow);
    $DOM.divRefinancebuy = getElementByRfcId(DOM_RFC_ID.divRefinancebuy);
    $DOM.nextStepArea = getElementByRfcId(DOM_RFC_ID.nextStepArea);
    $DOM.alertText = getElementByRfcId(DOM_RFC_ID.alertText);

    appendOferta();
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
    $DOM.leadFormInputName = getElementByRfcId('input:name');
    $DOM.calculationsArea = getElementByRfcId('calculations');
    $DOM.calculationsBtn = getElementByRfcId('calculationsBtn');
    $DOM.tableCalculations = getElementByRfcId('table-calculations');

  }

  function bindDOMEvents() {
    $DOM.leadFormInputPhone.mask("+7-999-999-99-99");

    $DOM.percentInput.on('keyup', onDataChange);
    $DOM.percentInput.on('change', onDataChange);

    $DOM.monthlyFeeInput.on('keyup', onDataChange);
    $DOM.monthlyFeeInput.on('change', onDataChange);

    $DOM.startMortgageInput.on('focusout', onDataChange);

    $DOM.yearsInput.on('keyup', onDataChange);
    $DOM.yearsInput.on('change', onDataChange);

    $DOM.newPercentInput.on('keyup', tableСalculation);
    $DOM.newPercentInput.on('change', tableСalculation);

    $DOM.leadFormInputPhone.on('keyup', checkLeadData);
    $DOM.leadFormInputName.on('keyup', checkLeadData);


    $DOM.checkboxForm.on('change', checkLeadData);
    $DOM.calculationsBtn.on('click', function() {
      $DOM.calculationsArea.show();
      $DOM.calculationsBtn.hide();
    });

    $DOM.sendLeadButton.on('click', function() {
      if ($DOM.sendLeadButton.attr('disabled')) return;

      $DOM.sendLeadButton.val('Отправляем...').attr('disabled', 'disabled');

      sendLeadRequest();
    });
  }

  function checkLeadData() {
    if ($DOM.checkboxForm.prop('checked') && $DOM.leadFormInputPhone.val().length > 0) {
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

    calculationsParams.startMortgage = DATA_OPERATION.getDateForRequest($DOM.startMortgageInput.val())

    var currentMonthFromStart = DATA_OPERATION.getDateMonthNumberFromStart();
    var dateStartMonthNumber = DATA_OPERATION.getDateMonthNumberFromStart($DOM.startMortgageInput.val());
    var lastDateMonth = dateStartMonthNumber + $DOM.yearsInput.val() * 12;
    var monthNumber = lastDateMonth % 12;
    var yearNumber = (lastDateMonth - monthNumber) / 12;
    calculationsParams.finishDateParent = MONTH_NAMES_PARENT_OBJ[MONTH_NAMES_SHORT[monthNumber - 1]] + ' ' + yearNumber;

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

    calculationsParams.creditBody = creditBody;
    calculationsParams.creditPercentes = creditPercentes;

    $DOM.balanceOfTheLoanLabel.html(DATA_OPERATION.splitIntoThousands(creditBody));
    $DOM.balanceOfTheInterestLabel.html("+ проценты " + DATA_OPERATION.splitIntoThousands(creditPercentes));
    if (checkInputs()) { tableСalculation(); }
  };

  function tableСalculation() {
    if (Number($DOM.newPercentInput.val()) <= Number($DOM.percentInput.val()) && $DOM.newPercentInput.val() != "" && Number($DOM.newPercentInput.val()) > 0) {
      $DOM.noCheating.hide();
      $DOM.tableCalculations.show();
      setParametersOfTableTR2();
      setParametersOfTableTR1();
      setParametersOfTableTR3();
    } else {
      $DOM.tableCalculations.hide();
      $DOM.noCheating.show();
    }

    calculationsParams.refinans_rate = parseFloat($DOM.percentInput.val());
    calculationsParams.refinans_payment = parseFloat($DOM.monthlyFeeInput.val());
    calculationsParams.refinans_date = calculationsParams.startMortgage;
    calculationsParams.refinans_period = parseFloat($DOM.yearsInput.val());
    calculationsParams.refinans_rate_now = parseFloat($DOM.newPercentInput.val());
    calculationsParams.refinans_price = calculationsParams.creditBody;
    calculationsParams.refinans_percent = calculationsParams.creditPercentes;

    $DOM.calculationsArea.html(getDescriptionText(calculationsParams));
  };

  function setMonthlyFeeArray() {
    HIDDEN_COLS = [false, false, false, false, false, false, false];
    var isSameRate = (parseFloat($DOM.percentInput.val()) === parseFloat($DOM.newPercentInput.val()));


    if (isSameRate) {
      monthlyFeeArray[0] = monthlyFeeArray[3]; // устанавливаем начальное значение в текущий платеж + 1000
      monthlyFeeArray[1] = monthlyFeeArray[0] * 1.25;
      monthlyFeeArray[2] = monthlyFeeArray[0] * 1.5;
      monthlyFeeArray[3] = monthlyFeeArray[0] * 1.75;
      monthlyFeeArray[4] = monthlyFeeArray[0] * 2;
      monthlyFeeArray[5] = monthlyFeeArray[0] * 2.5;
      monthlyFeeArray[6] = monthlyFeeArray[0] * 3;
    } else {
      monthlyFeeArray[1] = monthlyFeeArray[0] + Math.floor((monthlyFeeArray[3] - monthlyFeeArray[0]) / 3);
      monthlyFeeArray[2] = monthlyFeeArray[0] + Math.floor((monthlyFeeArray[3] - monthlyFeeArray[0]) / 3 * 2);
      monthlyFeeArray[4] = monthlyFeeArray[3] * 1.25;
      monthlyFeeArray[5] = monthlyFeeArray[3] * 1.5;
      monthlyFeeArray[6] = monthlyFeeArray[3] * 2;
    }


    for (var i = 1; i < monthlyFeeArray.length; i++) {
      monthlyFeeArray[i] = roundingThousands(monthlyFeeArray[i], 2);
    }

    if (monthlyFeeArray[2] >= monthlyFeeArray[3]) {
      HIDDEN_COLS[2] = true;
    }
    if (monthlyFeeArray[1] >= monthlyFeeArray[2]) {
      HIDDEN_COLS[1] = true;
    }
    if (monthlyFeeArray[0] >= monthlyFeeArray[1]) {
      HIDDEN_COLS[0] = true;
    }
  };

  function setParametersOfTableTR1() {
    var $elem;
    for (i = 0; i < monthlyFeeArray.length; i++) {
      var tdId = "rfc-td1";
      tdId += i + 1;
      $elem = $('[data-cell-id="' + tdId + '"]').html(DATA_OPERATION.splitIntoThousands(monthlyFeeArray[i]));

      HIDDEN_COLS[i] ? $elem.hide() : $elem.show();
    };
  };

  function setParametersOfTableTR2() {
    monthlyFeeArray[3] = Number($DOM.monthlyFeeInput.val());
    var theMaturityDateOfTheMortgage = new Array(7);
    var temp = 0,
      $elem;
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

      saving[i] = Math.floor(principalTotalInterestDebt - principalInterestDebt);
    };

    for (i = 0; i < theMaturityDateOfTheMortgage.length; i++) {
      var tdId = "rfc-td2";
      tdId += i + 1;
      $elem = $('[data-cell-id="' + tdId + '"]').html(theMaturityDateOfTheMortgage[i]);

      HIDDEN_COLS[i] ? $elem.hide() : $elem.show();
    };

    calculationsParams.monthlyFeeArray = [monthlyFeeArray[0], monthlyFeeArray[3], monthlyFeeArray[6]];
    calculationsParams.theMaturityDateOfTheMortgage = [theMaturityDateOfTheMortgage[0], theMaturityDateOfTheMortgage[3], theMaturityDateOfTheMortgage[6]];
    calculationsParams.saving = [saving[0], saving[3], saving[6]];
  };

  function setParametersOfTableTR3() {
    var $elem, tdId;
    for (i = 0; i < monthlyFeeArray.length; i++) {
      tdId = "rfc-td3";
      tdId += i + 1;


      $elem = $('[data-cell-id="' + tdId + '"]');

      if (saving[i] < 0) {
        $elem.html('Убыток: ' + DATA_OPERATION.splitIntoThousands(saving[i] * -1));
      } else {
        $elem.html(DATA_OPERATION.splitIntoThousands(saving[i]));
      }

      HIDDEN_COLS[i] ? $elem.hide() : $elem.show();
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


    function calcOverFee(creditAmount, creditPeriod, monthlyFee) {
      var X = monthlyFee; // ежемесячный платеж
      var NN = creditPeriod; // период кредитования
      var overFee = X * NN - creditAmount;
      return overFee;
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
    if (!data.years || data.years < VALIDATEION_FIELDS.yearsInterval.min || data.years > VALIDATEION_FIELDS.yearsInterval.max) {
      return
    }

    // выйти если платеж меньше минимума
    if (!data.currentPayment || data.currentPayment < VALIDATEION_FIELDS.currentPaymentMin) {
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


  function getDescriptionText(info) {
    var str = '<p>Ипотека на прежних условиях. Остаток по кредиту — ' + DATA_OPERATION.splitIntoThousands(info.refinans_price) + '. Будете гасить ипотеку по ставке ' + info.refinans_rate + '% и каждый месяц платить по ' + DATA_OPERATION.splitIntoThousands(info.refinans_payment) + '. В этом случае закроете ипотеку в ' + info.finishDateParent + '. За это время кроме основного долга отдадите ' + DATA_OPERATION.splitIntoThousands(info.refinans_percent) + ' процентов.</p>';
    str += '<p>Рефинансирование. Остаток по кредиту — ' + DATA_OPERATION.splitIntoThousands(info.refinans_price) + '.<br>Рефинансируете ипотеку и будете гасить ее по ставке ' + info.refinans_rate_now + '%. ';
    str += '<br>При платеже ' + DATA_OPERATION.splitIntoThousands(calculationsParams.monthlyFeeArray[0]) + ' закроете ипотеку в ' + DATA_OPERATION.replaceMonthNameToParent(calculationsParams.theMaturityDateOfTheMortgage[0]) + ', на процентах '+((calculationsParams.saving[0] > 0) ? 'сэкономите' : 'потеряете')+' ' + DATA_OPERATION.splitIntoThousands(calculationsParams.saving[0]) + '.';
    str += '<br>При платеже ' + DATA_OPERATION.splitIntoThousands(calculationsParams.monthlyFeeArray[1]) + ' закроете ипотеку в ' + DATA_OPERATION.replaceMonthNameToParent(calculationsParams.theMaturityDateOfTheMortgage[1]) + ', на процентах сэкономите ' + DATA_OPERATION.splitIntoThousands(calculationsParams.saving[1]) + '.';
    str += '<br>При платеже ' + DATA_OPERATION.splitIntoThousands(calculationsParams.monthlyFeeArray[2]) + ' закроете ипотеку в ' + DATA_OPERATION.replaceMonthNameToParent(calculationsParams.theMaturityDateOfTheMortgage[2]) + ', на процентах сэкономите ' + DATA_OPERATION.splitIntoThousands(calculationsParams.saving[2]) + '.</p>';
    str += '<p>Дополнительные расходы при рефинансировании ипотеки. Если вы уйдете из своего банка в другой, появятся дополнительные расходы. Вычтите эти расходы из полученной суммы экономии.</p>';
    str += '<p>Обязательные расходы: страхование имущества, титула, жизни и здоровья заемщика — от 0,3% суммы кредита, оценка квартиры — от 2000 ₽, госпошлина за снятие и наложение обременения — 1000 ₽. Это усредненные данные, попросите у своего банка точные суммы.</p>';
    str += '<p>Необязательные расходы (в зависимости от требований банка): повышенная ставка на период снятия обременения и наложения нового — плюс 0,5–2 процентных пункта к новой ставке по кредиту.</p>';

    return str;
  }

  function sendLeadRequest() {

    var data = {};

    for (var i in N1_API_PARAMS.baseParams) {
      data[i] = N1_API_PARAMS.baseParams[i];
    }

    data.phone = getElementByRfcId('input:phone').val();
    data.name = getElementByRfcId('input:name').val();

    data.params = {
      refinans_rate: calculationsParams.refinans_rate, // текущая процентная ставка
      refinans_payment: calculationsParams.refinans_payment, // текущий ежемесячный платеж
      refinans_date: calculationsParams.refinans_date, // месяц и год когда взял ипотеку
      refinans_period: calculationsParams.refinans_period, // период на какой взял ипотеку
      refinans_rate_now: calculationsParams.refinans_rate_now, // ставка после рефинансирования
      refinans_price: calculationsParams.creditBody, // остаток по оплате
      refinans_percent: calculationsParams.creditPercentes // проценты по оплате
    }

    ENV.postRequest(N1_API_PARAMS.url, data, function(q, w, e) {
      getElementByRfcId('finalArea').html('<div class="rfc-finalAreaText">' + FINAL_TEXT + '</div>');
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
    (function() {
      $INJECT_lib_datepicker_js;
    })();

    $DOM.startMortgageInput.datepicker({
      minView: 'months',
      dateFormat: 'MM yyyy',
      view: 'months',
      maxDate: maxInDataPicker,
      autoClose: true
    })

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
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8', //TODO: сделать нужный для N1 api тип
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

    self.splitIntoThousands = function(number) {
      number = number - (number % 1);
      number = String(number);
      number = number.replace(/\B(?=(?:\d{3})+(?!\d))/g, ' ');
      number += " ₽"
      return number;
    }

    self.replaceMonthNameToParent = function(str) {
      var strArr = str.split(' ');

      return MONTH_NAMES_PARENT_OBJ[strArr[0]] + ' ' + strArr[1];
    }

    return self;
  })();


})(window);