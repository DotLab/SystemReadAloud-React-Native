// @flow

import React, { Component } from "react";
import Native, { View, FlatList, Linking, AsyncStorage, Alert, Dimensions, ScrollView } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner } from "native-base";
import { RecyclerListView, DataProvider, LayoutProvider } from "recyclerlistview";

import Store from "react-native-simple-store";
import Tts from "react-native-tts";
import Fs from "react-native-fs";
import MeasureText from 'react-native-measure-text';
import TextSize from 'react-native-text-size'

import { TextDecoder } from "text-encoding";

import { base64ToRaw, rawToArray } from "./bit";
import { startAsync } from "./prom";

function sentenceKeyExtractor(text, index) {
	return text + "@" + index;
}

const settings = {
	splitRegExp: " *[\\n\\r]+ *",
	removeEmptyLines: true,
	fontSize: 14,
	fontWeight: "normal",
	fontFamily: "Roboto"
};

/*:: import type { Book } from "./App" */
/*:: import type { Ref } from "react" */

/*:: type Props = {
	book: Book,
	basePath: string,
	onClose: () => void
} */

/*:: type State = {
	loading?: string,
	sentences?: Array<string>,
	dataProvider: DataProvider
} */

/*:: type Sentence = {
	text: string,
	index: number
} */

export default class Reader extends Component /*:: <Props, State> */ {
	/*:: dataProvider: DataProvider */
	/*:: layoutProvider: LayoutProvider */
	/*:: screenWidth: number */
	/*:: sentences: Array<Sentence> */
	/*:: listRef: Ref<RecyclerListView> */
	/*:: measuringResults: Array<number> */

	constructor(props /*: Props */) {
		super(props);

		this.listRef = React.createRef();
		
		this.dataProvider = new DataProvider((r1, r2) => {
			return r1.text !== r2.text;
		});
		
		const { width } = Dimensions.get("window");
		this.screenWidth = width;
		this.layoutProvider = new LayoutProvider(() => 0, (_, dim, index) => {
			dim.width = width;
			dim.height = this.getSentenceHeight(index);
		});

		this.state = { dataProvider: this.dataProvider.cloneWithRows([]) };
	}

	componentDidMount() {
		this.init();
	}

	async init() {
		const props = this.props;

		this.setState({ loading: "Loading file..." });
		const base64 = await Fs.readFile(props.basePath + props.book.hash, "base64");

		this.setState({ loading: "Decoding text..." });
		const text = await startAsync/*:: <string> */(resolve => {
			const array = rawToArray(base64ToRaw(base64));
			resolve(new TextDecoder(props.book.encoding).decode(array));
		});

		// this.setState({ loading: undefined, text });
		this.parseText(text);
	}

	async parseText(text /*: string */) {
		this.setState({ loading: "Parsing text..." });
		var sentences = await startAsync/*:: <Array<Sentence>> */(resolve => {
			var lines = text.split(new RegExp(settings.splitRegExp));
			if (settings.removeEmptyLines) lines = lines.filter(x => x);
			resolve(lines.map((text, index) => ({ text, index })));
		});
		this.sentences = sentences;

		this.setState({ loading: "Measuring lines..." });
		// const measuring = await startAsync(resolve => {
		// 	resolve(sentences.map(x => {
		// 		x.promise = new Promise(r => x.resolve = r);
		// 		return x;
		// 	}));
		// });
		// this.setState({ measuring });
		// this.measuringResults = await Promise.all(measuring.map(x => x.promise));
		const time1 = new Date();
		// this.measuringResults = await MeasureText.heights({
		// 	texts: sentences.map(x => x.text),
		// 	width: this.screenWidth,
		// 	fontSize: settings.fontSize,
		// 	fontWeight: settings.fontWeight,
		// 	fontFamily: settings.fontFamily
		// });
		this.measuringResults = await TextSize.flatHeights({
			text: sentences.map(x => x.text),
			width: this.screenWidth,
			fontSize: settings.fontSize,
			fontWeight: settings.fontWeight,
			fontFamily: settings.fontFamily
		});
		const time2 = new Date();
		console.log(time2 - time1);
		// console.log(this.measuringResults.length);

		this.setState({ 
			loading: undefined,
			dataProvider: this.dataProvider.cloneWithRows(sentences) 
		});
		// this.listRef.scrollToIndex(100, true);
	}

	getSentenceHeight(index /*: number */) {
		return this.measuringResults[index] || 20;
	}

	renderSentence(_ /*: any */, { text } /*: Sentence */) {
		return <Native.Text style={{
			fontSize: settings.fontSize,
			fontWeight: settings.fontWeight,
			fontFamily: settings.fontFamily
		}}>{text}</Native.Text>
	}

	// renderMeasuringSentence({ resolve, text, index }) {
	// 	return <Native.Text key={index.toString()} onLayout={e => resolve(e.nativeEvent.layout.height)}>{text}</Native.Text>
	// }

	render() {
		const state = this.state;
		const props = this.props;

		return <Container>
			<Header>
				<Left><Button transparent onPress={props.onClose}>
					<Icon name="arrow-back" />
				</Button></Left>
				<Body><Title>{props.book.title}</Title></Body>
				<Right><Button transparent onPress={() => {
					this.sentences[0] = { ...this.sentences[0], text: this.sentences[0].text + "@" };
					console.log(this.sentences);
					this.setState({ dataProvider: this.dataProvider.cloneWithRows(this.sentences) })
				}}><Icon name="menu" /></Button></Right>
			</Header>
			<View style={{ flex: 1 }}>
				{/* {state.loading ? <Spinner /> : <ScrollView><Native.Text>{state.text}</Native.Text></ScrollView>} */}
				{/* {state.measuring ? <ScrollView>{state.measuring.map(x => this.renderMeasuringSentence(x))}</ScrollView> : state.loading ? <Spinner /> : <RecyclerListView
					ref={this.listRef}
					layoutProvider={this.layoutProvider}
					dataProvider={state.dataProvider}
					rowRenderer={this.renderSentence}
				/>} */}
				{state.loading ? <Spinner /> : <RecyclerListView
					ref={this.listRef}
					layoutProvider={this.layoutProvider}
					dataProvider={state.dataProvider}
					rowRenderer={this.renderSentence}
				/>}
			</View>
			<Footer>
				<FooterTab>
					<Button active><Text>{state.loading}</Text></Button>
				</FooterTab>
			</Footer>
		</Container>
	}
}