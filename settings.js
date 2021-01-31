export const settings = {
    // preprocess
    decodeHtml: true,
    toFullWidth: false,
    toHalfWidth: false,
    preEdits: [
        { regexp: "★☆.*☆★", replace: "" },
        { regexp: " *([a-zA-Z0-9 ]+) *", replace: " $1 " },
        { regexp: "\\!", replace: "! " },
        { regexp: "\\?", replace: "? " },
        { regexp: "哄夜", replace: "咲夜" },
    ],

    // split
    splitRegexp: " *[\\n\\r]+ *",
    measuringOffset: 0,  // doesn't quite work...

    // edit
    edits: [
        { regexp: "^", replace: "　　" },
        { regexp: " *(“.+?”) *", replace: " $1 " },
        { regexp: " *(‘.+?’) *", replace: " $1 " },
    ],

    // rendering
    textStyle: {
        color: "#F7F7EF",
        fontSize: 18,
        fontWeight: "normal",
        // fontFamily: "Roboto",
        fontFamily: "PingFang SC",
        fontStyle: "normal",
        // lineHeight: 27,
        backgroundColor: "#00000000",
    },
    textPaints: [
        { regexp: "第.+[卷章].+", style: { fontWeight: "bold", color: "#65D9EF" } },
        { regexp: "“+.+?”+", style: { color: "#E6DB73" } },
        { regexp: "「+.+?」+", style: { color: "#E6DB73" } },
        { regexp: "[a-zA-Z ]+", style: { color: "#B4E1D2" } },
        { regexp: "[0-9]+", style: { color: "#AE81FF" } },
        { regexp: "[零〇一二两三四五六七八九十百千万亿兆]+", style: { color: "#AE81FF" } },
        { regexp: "《+.+?》+", style: { color: "#F92671" } },
        { regexp: "【+.+?】+", style: { color: "#F92671" } },
        { regexp: "『+.+?』+", style: { color: "#F92671" } },
        { regexp: "[我你他她它]们?", style: { fontStyle: "italic" } },
        { regexp: "（+.+?）+", style: { color: "#74705E" } },
        { regexp: "\\(+.+?\\)+", style: { color: "#74705E" } },
    ],

    linePaddingX: 0,
    linePaddingY: 15,
    lineSpacing: 0,

    pageColor: "#000",
    lineColor: "#00000022",
    lineSelectedColor: "#ffffff44",
    lineScheduledColor: "#00ccff44",
    lineReadingColor: "#ffcccc44",
    lineReadColor: "#ff008822",

    // reading
    scheduleLength: 100,
    voiceStyle: {
        // voiceId: "cmn-cn-x-ssa-local",
        // pitch: .9,
        // rate: .8
        voiceId: "com.apple.ttsbundle.Ting-Ting-compact",
        pitch: 1,
        rate: .6
    },
    voicePaints: [
        // { regexp: "第.+[卷章].+", style: { pitch: .8, rate: 1 } },
        // { regexp: "“+.+?”+", style: { pitch: 1.4, rate: .9 } },
        // { regexp: "「+.+?」+", style: { pitch: 1.4, rate: .9 } },
        // { regexp: "‘+.+?’+", style: { pitch: 1.2, rate: .8 } },
        // { regexp: "『+.+?』+", style: { pitch: 1.2, rate: .8 } },
        // { regexp: "（+.+?）+", style: { pitch: .6, rate: .8 } },
        // { regexp: "\\(+.+?\\)+", style: { pitch: .6, rate: .8 } },
        // { regexp: "[a-zA-Z][a-zA-Z0-9 ]*", style: { voiceId: "en-us-x-sfg#female_1-local" } },
        // { regexp: "第.+[卷章].+", style: { pitch: .8, rate: 1 } },
        { regexp: "“+.+?”+", style: { voiceId: "com.apple.ttsbundle.Mei-Jia-premium" } },
        { regexp: "「+.+?」+", style: { voiceId: "com.apple.ttsbundle.Mei-Jia-premium" } },
        { regexp: "‘+.+?’+", style: { voiceId: "com.apple.ttsbundle.Mei-Jia-premium", pitch: .7, rate: .5 } },
        { regexp: "『+.+?』+", style: { voiceId: "com.apple.ttsbundle.Mei-Jia-premium", pitch: .7, rate: .5 } },
        { regexp: "（+.+?）+", style: { pitch: .6, rate: .6 } },
        { regexp: "\\(+.+?\\)+", style: { pitch: .6, rate: .6 } },
    ],
    voiceEdits: [
        { regexp: "[“”‘’（）\\(\\)「」『』]", replace: "" },
        { regexp: "^…+", replace: "" },
        { regexp: "(.)…+", replace: "$1$1$1。" },
    ]
};