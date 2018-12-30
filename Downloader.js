// @flow

import React, { Component } from "react";
import { View } from "react-native";
import { Container, Content, Header, Left, Body, Right, Button, Icon, Title, Text, List, ListItem, Footer, FooterTab, Spinner, Form, Textarea, Input, Item } from "native-base";

import Fs from "react-native-fs";

/*:: import type FsType from "react-native-fs" */

const TEMP = "TEMP";

/*:: type Props = {
	basePath: string,
	onFinish: (string, string) => any,
	onClose: () => any
} */

/*:: type State = {
	status?: string
} */

export default class Downloader extends Component /*:: <Props, State> */ {
	/*:: title: string */
	/*:: url: string */
	/*:: jobId: number */

	constructor(props/*: Props */) {
		super(props);

		this.state = {};
	}

	async onStartButtonPress() {
		if (typeof this.url !== "string" || typeof this.title !== "string" || this.state.status) {
			return;
		}

		const path = this.props.basePath + TEMP;
		const res = Fs.downloadFile({
			fromUrl: this.url,
			toFile: path,
			// headers: Headers,
			// progressDivider: number,
			// begin: (res: DownloadBeginCallbackResult) => void,
			progress: this.onProgress.bind(this),
		});

		this.jobId = res.jobId;
		this.setState({ status: "Starting..." });
		await res.promise;

		this.setState({ status: "Copying..." });
		this.props.onFinish(this.title, path);
	}

	onProgress(res/*: any */) {
		// console.log(res);
		this.setState({ status: (res.bytesWritten / 1024).toFixed(2) + " KB" });
	}

	render() {
		const status = this.state.status;

		return <Container>
			<Header>
				<Left>
					{!status && <Button transparent onPress={this.props.onClose}><Icon name="close" /></Button>}
				</Left>
				<Body><Title>Downloader</Title></Body>
				<Right />
			</Header>
			<View style={{ flex: 1 }}>
				{status ? <Spinner /> : <Form>
					<Textarea rowSpan={3} bordered placeholder="Title..." onChangeText={text => this.title = text} />
					<Textarea rowSpan={5} bordered placeholder="URL..." keyboardType="url" onChangeText={text => this.url = text} />
				</Form>}
			</View>
			<Footer>
				<FooterTab>
					<Button active onPress={this.onStartButtonPress.bind(this)}><Text>{status || "Download"}</Text></Button>
				</FooterTab>
			</Footer>
		</Container>;
	}
}