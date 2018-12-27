const zhSingleDict = { "零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10 };
const zhTenDict = { "零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 1 };
const zhTenSingleDict = { "零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 0 };

export function parseZhNumber(str) {
	if (str.length === 0) return 0;
	if (str.length === 1) {
		return zhSingleDict[str] || 0;
	}
	if (str.length === 2) {
		return (zhTenDict[str[0]] || 0) * 10 + (zhTenSingleDict[str[1]] || 0);
	}
	if (str.length === 3) {
		return (zhTenDict[str[0]] || 0) * 10 + (zhTenSingleDict[str[2]] || 0);
	}
	return undefined;
}

export function fixNumberWidth(num, width = 2) {
    var r = "" + num;
    while (r.length < width) {
        r = "0" + r;
    }
    return r;
}