// @flow

import React, { Component } from "react";
import { View, FlatList, Linking, AsyncStorage, Alert } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab } from "native-base";

import encodings from "./encodings";
import { TextDecoder } from "text-encoding";
import { rawToArray } from "./bit";

/*:: import type { Book } from "./App" */

function encodingKeyExtractor(encoding/*: string */) /*: string */ {
	return encoding;
}

/*:: type Props = {
	book: Book,
	onPickEncoding: (string) => any,
	onCancel: () => any
} */

export default class EncodingPicker extends Component /*:: <Props> */ {
	renderItem(buffer/*: Uint8Array */, encoding/*: string */) {
		const { book, onPickEncoding } = this.props;
		var decoded = "";
		try {
			decoded = new TextDecoder(encoding).decode(buffer);
		} catch (e) {
			decoded = "<decoding failed>";
		}
        return <ListItem button noIndent selected={encoding === book.encoding} onPress={() => onPickEncoding(encoding)}>
            <Body>
                <Text>{encoding}</Text>
                <Text note>{decoded}</Text>
            </Body>
        </ListItem>
    }

	render() {
		const { book, onCancel } = this.props;
		const buffer = rawToArray(book.excerptRaw);

		return <Container>
			<Header>
				<Left><Button transparent onPress={onCancel}><Icon name="arrow-back" /></Button></Left>
				<Body><Title>{book.title}</Title></Body>
				<Right />
			</Header>
			<Content>
				<FlatList
                    data={encodings}
					renderItem={({ item: encoding }) => this.renderItem(buffer, encoding)}
					keyExtractor={encodingKeyExtractor}
				/>
			</Content>
		</Container>
	}
}