import React, { Component } from "react";
import { View, FlatList, Linking, AsyncStorage, Alert } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab } from "native-base";

export default class Reader extends Component {
	constructor(props) {
		super(props);

		this.state = { utterances: [] };
	}

	componentDidMount() {
		this.init();
	}

	async init() {
		
	}

	render() {
		const state = this.state;
		const props = this.props;

		return <Container>
			<Header>
				<Left><Button transparent onPress={props.closeReader}>
					<Icon name="arrow-back" />
				</Button></Left>
				<Body><Title>{this.props.selectedDirItem.name}</Title></Body>
				<Right><Button transparent><Icon name="menu" /></Button></Right>
			</Header>
			<Content>
				<FlatList
					data={state.utterances}
				/>
			</Content>
		</Container>
	}
}