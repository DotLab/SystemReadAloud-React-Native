// @flow

import React, { Component } from "react";
import { View, FlatList, Linking, Alert } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner, ActionSheet, Root, Item, Input } from "native-base";

import Store from "react-native-simple-store";
import Tts from "react-native-tts";
import Fs from "react-native-fs";

import md5 from "js-md5";
import { TextDecoder } from "text-encoding";
import update from "immutability-helper";

import { base64ToRaw, rawToArray } from "./bit";
import { parseZhNumber, fixNumberWidth } from "./zhNumber";

import Reader from "./Reader";
import EncodingPicker from "./EncodingPicker";
import Downloader from "./Downloader";

import encodings from './encodings';

/*:: import type { ElementRef } from "react" */

const LIBRARY = "LIBRARY";
const BOOK_LIST_OFFSET = "BOOK_LIST_OFFSET";

const ENCODING_PICKER = "ENCODING_PICKER";
const READER = "READER";
const DOWNLOADER = "DOWNLOADER";

function bookComparer(a /*: Book */, b /*: Book */) {
	return a.sortTitle < b.sortTitle ? -1 : 1;
}

function bookKeyExtractor(x /*: Book */) {
	return x.hash;
}

function generateSortTitle(title) {
	return title.replace(/([零一二三四五六七八九十]+)/, seg => fixNumberWidth(parseZhNumber(seg)));
}

async function importBook(title, uri, basePath) {
	console.log("importing", title, uri);
	
	const text = await Fs.readFile(uri, "base64");
	const raw = base64ToRaw(text);
	const hash /*: string */ = md5(raw);
	await Fs.writeFile(basePath + hash, text, "base64");
	
	await Store.update(LIBRARY, { [hash]: {
		title,
		originalTitle: title,
		sortTitle: generateSortTitle(title),
		encoding: encodings[0],
		hash,
		size: raw.length,
		dateImported: new Date(),
		excerptRaw: raw.substr(0, 128),
		viewingLine: "",
		viewingIndex: 0,
		selectedIndex: 0,
		lineCount: 0,
	} });
}

/*:: type Props = {} */

/*:: type State = {
	importedBookTitle?: string,
	books?: Array<Book>,
	page?: string,
	pageProps?: Object,
	isEditMode: boolean
} */

/*:: export type Book = {
	index: number,
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
	selectedIndex: number,
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
		this.state = { isEditMode: false };
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
		const uri /*: ?string */ = await Linking.getInitialURL();
		if (uri) {
			const uriDecoded = decodeURIComponent(uri);
			const title = uriDecoded.substring(uriDecoded.lastIndexOf("/") + 1, uriDecoded.lastIndexOf("."));
			this.setState({ importedBookTitle: title });
			await importBook(title, uri, this.basePath);
		}
		this.reloadLibrary();
	}

	async reloadLibrary() {
		this.setState({ books: undefined });

		const library /*: Library */ = await Store.get(LIBRARY);
		const books /*: Array<any> */ = Object.values(library).filter(x => x);
		books.sort(bookComparer);
		books.forEach((x, i) => x.index = i);

		this.setState({ books });

		const offset = await Store.get(BOOK_LIST_OFFSET);
		this.listRef.current.scrollToOffset({ offset, animated: false });

		// test
		this.onBookListItemPress(books[0]);
		// this.onAddButtonPress();
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

	deleteBook(book /*: Book */) {
		if (book.originalTitle === this.state.importedBookTitle) this.setState({ importedBookTitle: undefined });

		Store.update(LIBRARY, { [book.hash]: null });
		Fs.unlink(this.basePath + book.hash);
		this.setState(update(this.state, { books: { $splice: [ [ book.index, 1 ] ] } }));
	}
	
	changeBookTitle(book, title) {
		const sortTitle = generateSortTitle(title);
		Store.update(LIBRARY, { [book.hash]: { title, sortTitle } });
		this.setState(update(this.state, { books: { [book.index]: {
			title: { $set: title }, sortTitle: { $set: sortTitle }
		} } }));
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
				onClose: (viewingLine, viewingIndex, selectedIndex, lineCount) => {
					Store.update(LIBRARY, { [book.hash]: {
						viewingLine, viewingIndex, selectedIndex, lineCount,
					} });
					// this.setState({ page: undefined });
					this.setState(update(this.state, { page: { $set: undefined }, books: { [book.index]: {
						viewingLine: { $set: viewingLine },
						viewingIndex: { $set: viewingIndex },
						selectedIndex: { $set: selectedIndex },
						lineCount: { $set: lineCount },
					} } }));
				}
			}
		});
	}

	renderBookListItem(book/*: Book */, isEditMode/*: boolean */) {
		if (isEditMode) {
			return <ListItem noIndent style={{ paddingLeft: 0 }}>
				<Body><Item regular><Input 
					style={{ fontSize: 14, height: 40 }} 
					value={book.title} 
					onChangeText={text => this.changeBookTitle(book, text)}
				/></Item></Body>
				<Right>
					<Button danger small onPress={() => this.deleteBook(book)}>
						<Text style={{ fontSize: 10 }}>Delete</Text>
					</Button>
				</Right>
			</ListItem>
		}

		return <ListItem 
			button noIndent 
			style={{ paddingLeft: 0 }}
			selected={book.originalTitle === this.state.importedBookTitle} 
			onPress={() => this.onBookListItemPress(book)}
		>
			<Body>
				{!!book.selectedIndex && <Text note numberOfLines={1}>
					{(book.selectedIndex / book.lineCount * 100).toFixed(1).toString()}%
					{!!book.viewingLine && " • " + book.viewingLine}
				</Text>}
				<Text>{book.title}</Text>
				<Text note numberOfLines={1}>
					{new Date(book.dateImported).toLocaleDateString()} • {(book.size / 1024).toFixed(0).toString()} KB
				</Text>
			</Body>
			<Right>
				<Button small onPress={() => this.pickBookEncoding(book)}><Text style={{ fontSize: 10 }} numberOfLines={1}>{book.encoding}</Text></Button>
			</Right>
		</ListItem>;
	}

	onAddButtonPress() {
		this.setState({
			page: DOWNLOADER,
			pageProps: {
				basePath: this.basePath,
				onFinish: async (title, path) => {
					this.setState({ page: undefined, importedBookTitle: title });
					await importBook(title, path, this.basePath);
					this.reloadLibrary();
				},
				onClose: () => {
					this.setState({ page: undefined });
				}
			}
		});
	}

	onEditButtonPress() {
		this.setState({ isEditMode: !this.state.isEditMode });
		if (!this.state.isEditMode) this.reloadLibrary();
	}

	render() {
		const state = this.state;

		switch (state.page) {
		case ENCODING_PICKER: return <EncodingPicker {...state.pageProps} />; 
		case READER: return <Reader {...state.pageProps} />; 
		case DOWNLOADER: return <Downloader {...state.pageProps} />;
		}

		return <Container>
			<Header>
				<Left>
					<Button transparent onPress={this.onEditButtonPress.bind(this)}><Icon name={state.isEditMode ? "close" : "create"} /></Button>
				</Left>
				<Body><Title>Library</Title></Body>
				<Right>
					{!state.isEditMode && <Button transparent onPress={this.onAddButtonPress.bind(this)}><Icon name="download" /></Button>}
				</Right>
			</Header>
			
			<View style={{ flex: 1 }}>
				{state.books ? <FlatList
					ref={this.listRef}
					data={state.books}
					keyExtractor={bookKeyExtractor}
					renderItem={({ item }) => this.renderBookListItem(item, state.isEditMode)}
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