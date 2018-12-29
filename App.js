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

/*:: import type { ElementRef } from "react" */

const LIBRARY = "LIBRARY";
const BOOK_LIST_OFFSET = "BOOK_LIST_OFFSET";

const ENCODING_PICKER = "ENCODING_PICKER";
const READER = "READER";

const BookListItemActionSheetConfig = {
	options: [ "Config", "Encoding", "Delete", "Cancel" ],
	destructiveButtonIndex: 2,
	cancelButtonIndex: 3,
	title: "Select an option:"
};

function bookComparer(a /*: Book */, b /*: Book */) {
	return a.sortTitle < b.sortTitle ? -1 : 1;
}

function bookKeyExtractor(x /*: Book */) {
	return x.hash;
}

/*:: type Props = {
	
} */

/*:: type State = {
	importedBookTitle?: string,
	books?: Array<Book>,
	page?: string,
	pageProps?: Object
} */

/*:: export type Book = {
	title: string,
	originalTitle: string,
	sortTitle: string,
	encoding: string,
	hash: string,
	size: number,
	dateImported: string,
	excerptRaw: string,
	viewingLine: string,
	viewingIndex: number,
	lineCount: number,
} */

/*:: type Library = {
	[key: string]: Book
} */

class App extends Component /*:: <Props, State> */ {
	/*:: basePath: string */
	/*:: listRef: ElementRef<FlatList> */

	constructor() {
		super();
		this.state = {};
		this.basePath = Fs.DocumentDirectoryPath + "/";
		this.listRef = React.createRef();
	}
	
	componentDidMount() {
		this.init();
	}

	async init() {
		// prepare store
		await Store.update(LIBRARY, {});

		// handle linking
		const url /*: ?string */ = await Linking.getInitialURL();
		if (url) {
			const urlDecoded = decodeURIComponent(url);
			const title = urlDecoded.substring(urlDecoded.lastIndexOf("/") + 1, urlDecoded.lastIndexOf("."));
			console.log(url, urlDecoded, title);
			this.setState({ importedBookTitle: title });

			const text = await Fs.readFile(url, "base64");
			const raw = base64ToRaw(text);
			const hash /*: string */ = md5(raw);
			await Fs.writeFile(this.basePath + hash, text, "base64");

			await Store.update(LIBRARY, { [hash]: {
				title,
				originalTitle: title,
				sortTitle: title.replace(/([零一二三四五六七八九十]+)/, seg => fixNumberWidth(parseZhNumber(seg))),
				encoding: encodings[0],
				hash,
				size: raw.length,
				dateImported: new Date(),
				excerptRaw: raw.substr(0, 128),
				viewingLine: "",
				viewingIndex: 0,
				lineCount: 0,
			} });
		}
		
		this.reloadLibrary();
	}

	async reloadLibrary() {
		this.setState({ books: undefined });

		const library /*: Library */ = await Store.get(LIBRARY);
		const books /*: Array<any> */ = Object.values(library).filter(x => x);
		console.log(books);
		books.sort(bookComparer);

		this.setState({ books });
		const offset = await Store.get(BOOK_LIST_OFFSET);
		this.listRef.current.scrollToOffset({ offset, animated: false });

		// test
		this.onBookListItemPress(books[0]);
	}

	pickBookEncoding(book /*: Book */) {
		this.setState({
			page: ENCODING_PICKER,
			pageProps: {
				book,
				onCancel: () => {
					this.setState({ page: undefined });
				},
				onPickEncoding: encoding => {
					book.encoding = encoding;
					Store.update(LIBRARY, { [book.hash]: { encoding } });
					this.setState({ page: undefined });
				}
			}
		});
	}

	async deleteBook(book /*: Book */) {
		if (book.originalTitle === this.state.importedBookTitle) this.setState({ importedBookTitle: undefined });

		await Store.update(LIBRARY, { [book.hash]: null });
		Fs.unlink(this.basePath + book.hash);
		this.reloadLibrary();
	}

	onBookListItemActionSheetSelect(book /*: Book */, index) {
		switch (index) {
		case 0: return;  // config
		case 1: this.pickBookEncoding(book); return;  // encoding
		case 2: this.deleteBook(book); return; // delete
		}
	}

	onBookListItemPress(book /*: Book */) {
		this.setState({
			page: READER,
			pageProps: {
				book,
				basePath: this.basePath,
				onClose: async (viewingLine, viewingIndex, lineCount) => {
					this.setState({ page: undefined });
					await Store.update(LIBRARY, { [book.hash]: {
						viewingLine, viewingIndex, lineCount,
					} });
					this.reloadLibrary();
				}
			}
		});
	}

	renderBookListItem({ item: book }) {
		return <ListItem 
			button noIndent 
			style={{ paddingLeft: 0 }}
			selected={book.originalTitle === this.state.importedBookTitle} 
			onPress={() => this.onBookListItemPress(book)}
		>
			<Body>
				{!!book.viewingIndex && <Text note numberOfLines={1}>
					{(book.viewingIndex / book.lineCount * 100).toFixed(1).toString()}%
					{!!book.viewingLine && " • " + book.viewingLine}
				</Text>}
				<Text>{book.title}</Text>
				<Text note numberOfLines={1}>
					{new Date(book.dateImported).toLocaleDateString()} • {(book.size / 1024).toFixed(0).toString()} KB
				</Text>
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
			
			<View style={{ flex: 1 }}>
				{state.books ? <FlatList
					ref={this.listRef}
					data={state.books}
					keyExtractor={bookKeyExtractor}
					renderItem={this.renderBookListItem.bind(this)}
					onScrollEndDrag={e => Store.save(BOOK_LIST_OFFSET, e.nativeEvent.contentOffset.y)}
					onMomentumScrollEnd={e => Store.save(BOOK_LIST_OFFSET, e.nativeEvent.contentOffset.y)}
				/> : <Spinner />}
			</View>

			{state.importedBookTitle && <Footer>
				<FooterTab>
					<Button active><Text>{state.importedBookTitle}</Text></Button>
				</FooterTab>
			</Footer>}
		</Container>;
	}
}

export default () => <Root><App /></Root>;