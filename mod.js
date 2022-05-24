// formatter for shortened cookie strings, will need to add more later
const numberLengthener = (baseString) =>
  [
    {
      used: baseString.includes("million"),
      get numberVal() {
        return +baseString.replace(` million`, "").replace(/,/g, "") * 1.0e6;
      },
    },
    {
      used: baseString.includes("billion"),
      get numberVal() {
        return +baseString.replace(` billion`, "").replace(/,/g, "") * 1.0e9;
      },
    },
    {
      used: baseString.includes("trillion"),
      get numberVal() {
        return +baseString.replace(` trillion`, "").replace(/,/g, "") * 1.0e12;
      },
    },
  ].find((formatter) => formatter.used)?.numberVal ||
  +baseString.replace(/,/g, "");

const numberShortener = (baseNumber) =>
  Math.abs(Number(baseNumber)) >= 1.0e12
    ? (Number(baseNumber) / 1.0e12).toFixed(2) + " Trillion"
    : Math.abs(Number(baseNumber)) >= 1.0e9
    ? Number(baseNumber) / (1.0e9).toFixed(2) + " Billion"
    : Number(baseNumber) >= 1.0e6
    ? (Number(baseNumber) / 1.0e6).toFixed(2) + "Million"
    : Number(baseNumber).toFixed(2);

// should prefix any injected dom data
const INJECTION_PREFIX = "cookies_mod";

// run on each detected mutation
const callback = function (mutationList, observer) {
  for (const mutation of mutationList) {
    // prevent memory leak
    if (
      Boolean(
        mutation?.addedNodes[0]?.dataset?.[`${INJECTION_PREFIX}_modified`]
      )
    )
      continue;

    // retrieve data points needed from DOM
    const costString =
      mutation?.addedNodes[0]?.childNodes[1]?.childNodes[0]?.childNodes[0]
        ?.data;
    const cpsString =
      mutation?.addedNodes[0]?.childNodes[8]?.childNodes[1]?.childNodes[0]
        ?.data;
    const cookiesString = document.getElementById("cookies").childNodes[0].data;
    const myCpsString =
      document.getElementById("cookies").childNodes[3].childNodes[0].data;

    // skip if a needed value is missing (unsupported tooltip configuration)
    if (!costString || !cpsString || !cookiesString || !myCpsString) {
      // console.error(mutation, document.getElementById("cookies").childNodes); // for debugging
      continue;
    }

    // format data
    const cost = numberLengthener(costString);
    const cps = numberLengthener(cpsString);
    const cookies = numberLengthener(cookiesString);
    const myCps = numberLengthener(myCpsString.replace("per second : ", ""));

    // infered values
    const cookiesPerCps = cost / cps;
    const secondsTilPurchase = cost > cookies ? (cost - cookies) / myCps : 0;
    const minsTilPurchase = secondsTilPurchase / 60;
    const hoursTilPurchase = minsTilPurchase / 60;
    const daysTilPurchase = hoursTilPurchase / 24;

    // inject new data into DOM
    const costElement = mutation?.addedNodes[0]?.childNodes[1]?.childNodes[0];
    const cookiesPerCpsElement = costElement.cloneNode(true);
    const timeTillPurchaseElement = costElement.cloneNode(true);

    cookiesPerCpsElement.childNodes[0].data =
      numberShortener(cookiesPerCps) + " cpd";
    timeTillPurchaseElement.childNodes[0].data =
      daysTilPurchase > 1
        ? `${daysTilPurchase.toFixed(2)} days`
        : hoursTilPurchase > 1
        ? `${hoursTilPurchase.toFixed(2)} hrs`
        : minsTilPurchase > 1
        ? `${minsTilPurchase.toFixed(2)} mins`
        : `${secondsTilPurchase.toFixed(2)} secs`;

    // prevent memory leak
    mutation.addedNodes[0].dataset[`${INJECTION_PREFIX}_modified`] = true;

    costElement.after(cookiesPerCpsElement, timeTillPurchaseElement);
    /* for debugging
    console.log({
      cost,
      cps,
      cookies,
      myCps,
      cookiesPerCps,
      secondsTilPurchase,
      minsTilPurchase,
      hoursTilPurchase,
      daysTilPurchase,
      mutation,
    });
    */
  }
};

// configure observer
const observer = new MutationObserver(callback);

// observe DOM element
observer.observe(document.getElementById("tooltip"), {
  attributes: true,
  childList: true,
  subtree: true,
});
