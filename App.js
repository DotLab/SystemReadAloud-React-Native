import React, { Component } from "react";
import { View, FlatList, Linking } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner } from "native-base";

import Store from "react-native-simple-store";
import Tts from "react-native-tts";
import Fs from "react-native-fs";

import md5 from "js-md5";
import { TextDecoder } from "text-encoding";

import { base64ToRaw, rawToArray } from "./bit";
import { parseZhNumber, fixNumberWidth } from "./zhNumber";

import Reader from "./Reader";
import EncodingPicker from "./EncodingPicker";

import encodings from './encodings';

const LIBRARY = "LIBRARY";
const ENCODING_PICKER = "ENCODING_PICKER";

function bookComparer(a, b) {
	return a.sortTitle < b.sortTitle ? -1 : 1;
}

function bookKeyExtractor(x) {
	return x.hash;
}

export default class App extends Component {
	constructor() {
		super();
		this.state = {};
		this.basePath = Fs.DocumentDirectoryPath + "/";
	}
	
	componentDidMount() {
		this.init();
	}

	async init() {
		// prepare store
		await Store.update(LIBRARY, {});

		// handle linking
		const url = await Linking.getInitialURL();
		if (url) {
			const urlDecoded = decodeURIComponent(url);
			const title = urlDecoded.substring(urlDecoded.lastIndexOf("/") + 1, urlDecoded.lastIndexOf("."));
			console.log(url, urlDecoded, title);
			this.setState({ importedBookTitle: title });

			const text = await Fs.readFile(url, "base64");
			const raw = base64ToRaw(text);
			const hash = md5(raw);
			await Fs.writeFile(this.basePath + hash, text, "base64");

			await Store.update(LIBRARY, { [hash]: {
				title,
				originalTitle: title,
				sortTitle: title.replace(/([零一二三四五六七八九十]+)/, seg => fixNumberWidth(parseZhNumber(seg))),
				encoding: encodings[0],
				hash,
				size: raw.length,
				dateImported: new Date(),
				excerptRaw: raw.substr(0, 128)
			} });
		}
		
		this.onReloadLibrary();
	}

	async onReloadLibrary() {
		this.setState({ books: undefined });

		const library = await Store.get(LIBRARY);
		const books = Object.values(library);
		books.sort(bookComparer);

		this.setState({ books });
	}

	onBookEncodingButtonPress(book) {
		this.setState({
			page: ENCODING_PICKER,
			pageProps: {
				book,
				onCancel: () => {
					this.setState({ page: undefined, pageProps: undefined });
				},
				onPickEncoding: encoding => {
					book.encoding = encoding;
					Store.update(LIBRARY, { [book.hash]: { encoding } });
					this.setState({ page: undefined, pageProps: undefined });
				}
			}
		});
	}

	renderBookListItem({ item: book }) {
		return <ListItem button noIndent selected={book.originalTitle === this.state.importedBookTitle} onPress={() => this.setState({ selectedDirItem: book })}>
			<Body>
				<Text>{book.title}</Text>
				<Text note>{new Date(book.dateImported).toLocaleDateString()} • {(book.size / 1024).toFixed(0).toString()} KB</Text>
			</Body>
			<Right>
				<Button light small onPress={() => this.onBookEncodingButtonPress(book)}><Text style={{ fontSize: 12 }} numberOfLines={1}>{book.encoding}</Text></Button>
			</Right>
		</ListItem>;
	}

	render() {
		const state = this.state;

		if (state.page === ENCODING_PICKER) {
			return <EncodingPicker {...state.pageProps} />;
		}

		return <Container>
			<Header>
				<Left>
					<Button transparent onPress={this.onReloadLibrary.bind(this)}><Icon name="refresh" /></Button>
				</Left>
				<Body><Title>Library</Title></Body>
				<Right>
					<Button transparent><Icon name="menu" /></Button>
				</Right>
			</Header>
			
			<Content>
				{state.books ? <FlatList
					data={state.books}
					keyExtractor={bookKeyExtractor}
					renderItem={this.renderBookListItem.bind(this)}
				/> : <Spinner />}
			</Content>

			{state.importedBookTitle && <Footer>
				<FooterTab>
					<Button full><Text>{state.importedBookTitle}</Text></Button>
				</FooterTab>
			</Footer>}
		</Container>;
	}
}