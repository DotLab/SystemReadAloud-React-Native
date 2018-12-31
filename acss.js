// @flow

const NUMBER = "NUMBER";
const ENUM = "ENUM";
const COLOR = "COLOR";

const rules = {
	// flex box
	ac: { n: "alignContent", t: ENUM, e: { fs: "flex-start", fe: "flex-end", c: "center", st: "stretch", sb: "space-between", sa: "space-around" } },
	ai: { n: "alignItems", t: ENUM, e: { fs: "flex-start", fe: "flex-end", c: "center", st: "stretch", b: "baseline" } },
	as: { n: "alignSelf", t: ENUM, e: { a: "auto", fs: "flex-start", fe: "flex-end", c: "center", st: "stretch", b: "baseline" } },
	ar: { n: "aspectRatio", t: NUMBER },
	bdbw: { n: "borderBottomWidth", t: NUMBER },
	bdlw: { n: "borderLeftWidth", t: NUMBER },
	bdrw: { n: "borderRightWidth", t: NUMBER },
	bdtw: { n: "borderTopWidth", t: NUMBER },
	bdendw: { n: "borderEndWidth", t: NUMBER },
	bdstartw: { n: "borderStartWidth", t: NUMBER },
	bdw: { n: "borderWidth", t: NUMBER },
	b: { n: "bottom", t: NUMBER },
	dir: { n: "direction", t: ENUM, e: { i: "inherit", ltr: "ltr", rtl: "rtl" } },
	d: { n: "display", t: ENUM, e: { n: "none", f: "flex" } },
	end: { n: "end", t: NUMBER },
	start: { n: "start", t: NUMBER },
	fx: { n: "flex", t: NUMBER },
	fxd: { n: "flexDirection", t: ENUM, e: { r: "row", rr: "row-reverse", c: "column", cr: "column-reverse" } },
	fxb: { n: "flexBasis", t: NUMBER },
	fxg: { n: "flexGrow", t: NUMBER },
	fxs: { n: "flexShrink", t: NUMBER },
	fxw: { n: "flexWrap", t: ENUM, e: { w: "wrap", nw: "nowrap" } },
	h: { n: "height", t: NUMBER },
	jc: { n: "justifyContent", t: ENUM, e: { fs: "flex-start", fe: "flex-end", c: "center", sb: "space-between", sa: "space-around" } },
	l: { n: "left", t: NUMBER },
	m: { n: "margin", t: NUMBER },
	mb: { n: "marginBottom", t: NUMBER },
	mx: { n: "marginHorizontal", t: NUMBER },
	ml: { n: "marginLeft", t: NUMBER },
	mr: { n: "marginRight", t: NUMBER },
	mt: { n: "marginTop", t: NUMBER },
	my: { n: "marginVertical", t: NUMBER },
	mend: { n: "marginEnd", t: NUMBER },
	mstart: { n: "marginStart", t: NUMBER },
	mah: { n: "maxHeight", t: NUMBER },
	maw: { n: "maxWidth", t: NUMBER },
	mih: { n: "minHeight", t: NUMBER },
	miw: { n: "minWidth", t: NUMBER },
	p: { n: "padding", t: NUMBER },
	pb: { n: "paddingBottom", t: NUMBER },
	px: { n: "paddingHorizontal", t: NUMBER },
	pl: { n: "paddingLeft", t: NUMBER },
	pr: { n: "paddingRight", t: NUMBER },
	pt: { n: "paddingTop", t: NUMBER },
	py: { n: "paddingVertical", t: NUMBER },
	pend: { n: "paddingEnd", t: NUMBER },
	pstart: { n: "paddingStart", t: NUMBER },
	pos: { n: "position", t: ENUM, e: { a: "absolute", r: "relative" } },
	r: { n: "right", t: NUMBER },
	t: { n: "top", t: NUMBER },
	w: { n: "width", t: NUMBER },
	z: { n: "zIndex", t: NUMBER },

	// view
	bfv: { n: "backfaceVisibility", t: ENUM, e: { v: "visible", h: "hidden" } },
	bgc: { n: "backgroundColor", t: COLOR },
	bdbc: { n: "borderBottomColor", t: COLOR },
	bdrsbend: { n: "borderBottomEndRadius", t: NUMBER },
	bdrsbstart: { n: "borderBottomStartRadius", t: NUMBER },
	bdrsbl: { n: "borderBottomLeftRadius", t: NUMBER },
	bdrsbr: { n: "borderBottomRightRadius", t: NUMBER },
	bdbw: { n: "borderBottomWidth", t: NUMBER },
	bdc: { n: "borderColor", t: COLOR },
	bdendc: { n: "borderEndColor", t: COLOR },
	bdstartc: { n: "borderStartColor", t: COLOR },
	bdlc: { n: "borderLeftColor", t: COLOR },
	bdlw: { n: "borderLeftWidth", t: NUMBER },
	bdrs: { n: "borderRadius", t: NUMBER },
	bdrc: { n: "borderRightColor", t: COLOR },
	bdrw: { n: "borderRightWidth", t: NUMBER },
	bds: { n: "borderStyle", t: ENUM, e: { s: "solid", d: "dotted", da: "dashed" } },
	bdtc: { n: "borderTopColor", t: COLOR },
	bdrstend: { n: "borderTopEndRadius", t: NUMBER },
	bdrststart: { n: "borderTopStartRadius", t: NUMBER },
	bdrstl: { n: "borderTopLeftRadius", t: NUMBER },
	bdrstr: { n: "borderTopRightRadius", t: NUMBER },
	bdtw: { n: "borderTopWidth", t: NUMBER },
	bdw: { n: "borderWidth", t: NUMBER },
	op: { n: "opacity", t: NUMBER },
	ov: { n: "overflow", t: ENUM, e: { v: "visible", h: "hidden" } },

	// text
	c: { n: "color", t: COLOR },
	// ff: { n: "fontFamily", t: STRING },
	fz: { n: "fontSize", t: NUMBER },
	fs: { n: "fontStyle", t: ENUM, e: { n: "normal", i: "italic" } },
	tt: { n: "textTransform", t: ENUM, e: { n: "none", u: "uppercase", l: "lowercase", c: "capitalize" } },
	fw: { n: "fontWeight", t: ENUM, e: { n: "normal", b: "bold", "100": "100", "200": "200", "300": "300", "400": "400", "500": "500", "600": "600", "700": "700", "800": "800", "900": "900" } },
	lh: { n: "lineHeight", t: NUMBER },
	ta: { n: "textAlign", t: ENUM, e: { a: "auto", l: "left", r: "right", c: "center", j: "justify" } },
	td: { n: "textDecorationLine", t: ENUM, e: { n: "none", u: "underline", lt: "line-through" } },
	tshc: { n: "textShadowColor", t: COLOR },
	tshrs: { n: "textShadowRadius", t: NUMBER },
};

const dict = {};
function comparer(a/*: string */, b/*: string */) /*: number */ {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

export default function a(style/*: string */) /*: Object */ {
	const segments = style.trim().split(/ +/).sort(comparer);
	const key = segments.join(" ");
	if (!dict[key]) {
		return dict[key] = buildJss(segments);
	}
	return dict[key];
}

export function buildJss(segments/*: Array<string> */) /*: Object */ {
	const jss = {};
	segments.forEach(s => {
		const parts = s.split("-");
		if (parts.length !== 2) throw new Error("Not in ACSS format `" + s + "`");
		
		const rule = rules[parts[0].toLowerCase()];
		if (!rule) throw new Error("No rule found for `" + parts[0] + "` in `" + s + "`");
		
		switch (rule.t) {
		case NUMBER:
			const number = parseFloat(parts[1]);
			if (isNaN(number)) throw new Error("Not a number: `" + parts[1] + "` in `" + s + "`");
			return jss[rule.n] = number;
		case ENUM:
			const option = rule.e[parts[1].toLowerCase()];
			if (!option) throw new Error("Option not found for `" + parts[1] + "` in `" + s + "`");
			return jss[rule.n] = option;
		case COLOR:
			const color = parts[1];
			if (/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?/.test(color)) throw new Error("Not a number: `" + parts[1] + "` in `" + s + "`");
			return jss[rule.n] = color;
		}
	});
	return jss;
}