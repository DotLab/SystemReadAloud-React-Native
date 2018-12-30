// @flow

import React, { Component } from "react";
import Native, { View, FlatList, Dimensions, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner } from "native-base";
import { RecyclerListView, DataProvider, LayoutProvider } from "recyclerlistview";

import Tts from "react-native-tts";
import Fs from "react-native-fs";
import MeasureText from 'react-native-measure-text';
import TextSize from 'react-native-text-size'

import He from "he";
import { TextDecoder } from "text-encoding";
import update from 'immutability-helper';

import { base64ToRaw, rawToArray } from "./bit";
import { startAsync } from "./prom";
import { toFullWidth, toHalfWidth } from "./fullWidth"

/*:: type Props = {|
	text: string,
	onClose: (string, number, number, number) => any
|} */

/*:: type State = {|
|} */

export default class TextConfigPanel extends Component /*:: <Props, State> */ {

	render() {
		return <Container>
			<Header>
				<Left><Button transparent onPress={this.props.onClose}>
					<Icon name="arrow-back" />
				</Button></Left>
				<Body><Title>Text Config</Title></Body>
				<Right />
			</Header>
			<View style={{ flex: 1 }}>
                <ScrollView>
                    
                </ScrollView>
			</View>
		</Container>
	}
}