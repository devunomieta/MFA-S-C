export function numberToWords(num: number): string {
  if (num === 0 || isNaN(num)) return "Zero";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
    "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertLessThanOneThousand = (n: number): string => {
    if (n === 0) return "";
    let res = "";
    if (n >= 100) {
      res += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (res !== "") res += "and ";
      if (n < 20) {
        res += a[n] + " ";
      } else {
        res += b[Math.floor(n / 10)] + " ";
        if (n % 10 > 0) {
          res += a[n % 10] + " ";
        }
      }
    }
    return res;
  };

  if (num < 0) return "Minus " + numberToWords(Math.abs(num));

  let res = "";
  const billion = Math.floor(num / 1000000000);
  const million = Math.floor((num % 1000000000) / 1000000);
  const thousand = Math.floor((num % 1000000) / 1000);
  const remainder = Math.floor(num % 1000);

  if (billion > 0) {
    res += convertLessThanOneThousand(billion) + "Billion ";
  }
  if (million > 0) {
    res += convertLessThanOneThousand(million) + "Million ";
  }
  if (thousand > 0) {
    res += convertLessThanOneThousand(thousand) + "Thousand ";
  }
  if (remainder > 0) {
    res += convertLessThanOneThousand(remainder);
  }

  return res.trim() + " Naira";
}
