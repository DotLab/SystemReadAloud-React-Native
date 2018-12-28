// @flow

import React, { Component } from "react";
import { View, FlatList, Linking, Alert } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner, ActionSheet, Root } from "native-base";

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
const READER = "READER";

const BookListItemActionSheetConfig = {
	options: [ "Config", "Encoding", "Delete", "Cancel" ],
	destructiveButtonIndex: 2,
	cancelButtonIndex: 3,
};

function bookComparer(a, b) {
	return a.sortTitle < b.sortTitle ? -1 : 1;
}

function bookKeyExtractor(x) {
	return x.hash;
}

/*:: type Props = {
	
} */

/*:: type State = {
	
} */

class App extends Component /*:: <Props, State> */ {
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
		
		this.reloadLibrary();
	}

	async reloadLibrary() {
		this.setState({ books: null });

		const library = await Store.get(LIBRARY);
		const books = Object.values(library).filter(x => x);
		console.log(books);
		books.sort(bookComparer);

		this.setState({ books });

		// test
		this.onBookListItemPress(books[0]);
	}

	pickBookEncoding(book) {
		this.setState({
			page: ENCODING_PICKER,
			pageProps: {
				book,
				onCancel: () => {
					this.setState({ page: null });
				},
				onPickEncoding: encoding => {
					book.encoding = encoding;
					Store.update(LIBRARY, { [book.hash]: { encoding } });
					this.setState({ page: null });
				}
			}
		});
	}

	async deleteBook(book) {
		if (book.originalTitle === this.state.importedBookTitle) this.setState({ importedBookTitle: null });

		await Store.update(LIBRARY, { [book.hash]: null });
		Fs.unlink(this.basePath + book.hash);
		this.reloadLibrary();
	}

	onBookListItemActionSheetSelect(book, index) {
		switch (index) {
		case 0: return;  // config
		case 1: this.pickBookEncoding(book); return;  // encoding
		case 2: this.deleteBook(book); return; // delete
		}
	}

	onBookListItemPress(book) {
		this.setState({
			page: READER,
			pageProps: {
				book,
				basePath: this.basePath,
				onClose: () => this.setState({ page: null })
			}
		});
	}

	renderBookListItem({ item: book }) {
		return <ListItem 
			button noIndent 
			selected={book.originalTitle === this.state.importedBookTitle} 
			onPress={() => this.onBookListItemPress(book)}
		>
			<Body>
				<Text>{book.title}</Text>
				<Text note>{new Date(book.dateImported).toLocaleDateString()} • {(book.size / 1024).toFixed(0).toString()} KB</Text>
			</Body>
			<Right>
				<Button small onPress={() => {
					ActionSheet.show(
						Object.assign(BookListItemActionSheetConfig, { title: book.title }), 
						index => this.onBookListItemActionSheetSelect(book, index)
					);
				}}><Text style={{ fontSize: 10 }} numberOfLines={1}>{book.encoding}</Text></Button>
			</Right>
		</ListItem>;
	}

	render() {
		const state = this.state;

		switch (state.page) {
		case ENCODING_PICKER: return <EncodingPicker {...state.pageProps} />; 
		case READER: return <Reader {...state.pageProps} />; 
		}

		return <Container>
			<Header>
				<Left>
					<Button transparent onPress={this.reloadLibrary.bind(this)}><Icon name="refresh" /></Button>
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
					<Button active><Text>{state.importedBookTitle}</Text></Button>
				</FooterTab>
			</Footer>}
		</Container>;
	}
}

export default () => <Root><App /></Root>;