import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Text, Image, View, ScrollView, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { colors, fontStyles, baseStyles, activeOpacity } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import Animated, { Easing } from 'react-native-reanimated';
import PreventScreenshot from '../../../core/PreventScreenshot';

import CreateBackground from '../../../images/addbackground.png';
import ImportBackground from '../../../images/seedphrasebackground.png';
import Create from '../../../images/Add.png';
import Import from '../../../images/seedphrase.png';
import Logo from '../../../images/img_support_network.png';
import importKey from '../../../images/ic_import_key.png';
import MStatusBar from '../../UI/MStatusBar';
import { ChooseTypeCreate, ChooseTypeImportPrivateKey, ChooseTypeImportSeedPhrase } from '../ChoosePassword';

const styles = StyleSheet.create({
	scroll: {
		flex: 1
	},
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	scrollWrapper: {
		flex: 1
	},
	title: {
		fontSize: 36,
		color: colors.fontPrimary,
		...fontStyles.bold,
		lineHeight: 48,
		textAlign: 'center'
	},
	ctas: {
		flex: 1,
		alignItems: 'center'
	},
	buttonDescription: {
		...fontStyles.normal,
		fontSize: 20,
		textAlign: 'center',
		color: colors.grey,
		lineHeight: 30
	},
	importWrapper: {
		marginVertical: 10
	},
	createButtonWrapper: {
		width: 320,
		height: 129,
		marginTop: 62
	},
	importButtonWrapper: {
		marginTop: 16,
		width: 320,
		height: 129
	},
	buttonBackground: {
		flex: 1
	},
	createWallet: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 36
	},
	createWalletText: {
		marginLeft: 15.5,
		fontSize: 16,
		color: colors.white,
		...fontStyles.bold,
		width: 150,
		lineHeight: 22
	},
	bottomText: {
		fontSize: 12,
		textAlign: 'center',
		color: colors.$8F92A1,
		marginHorizontal: 38
	},
	footerLogo: {
		marginTop: 6,
		marginBottom: 23
	},
	importKeyWrapper: {
		borderRadius: 10,
		borderWidth: 1,
		borderColor: colors.$FF894B,
		width: 320,
		height: 44,
		marginTop: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	importKeyText: {
		...fontStyles.semibold,
		fontSize: 16,
		color: colors.$FF894B,
		marginLeft: 10
	}
});

/**
 * View that is displayed to first time (new) users
 */
class Onboarding extends PureComponent {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	notificationAnimated = new Animated.Value(100);

	animatedTimingStart = (animatedRef, toValue) => {
		Animated.timing(animatedRef, {
			toValue,
			duration: 500,
			easing: Easing.linear,
			useNativeDriver: true
		}).start();
	};

	componentDidMount() {
		PreventScreenshot.forbid();
	}

	componentWillUnmount() {
		PreventScreenshot.allow();
	}

	onPressCreate = () => {
		const action = () => {
			this.props.navigation.navigate('ChoosePassword', { ChooseType: ChooseTypeCreate });
		};
		action();
	};

	onPressImport = () => {
		const action = () => {
			this.props.navigation.navigate('ChoosePassword', { ChooseType: ChooseTypeImportSeedPhrase });
		};
		action();
	};

	onPressImportPrivateKey = () => {
		const action = () => {
			this.props.navigation.navigate('ChoosePassword', { ChooseType: ChooseTypeImportPrivateKey });
		};
		action();
	};

	renderContent() {
		return (
			<View style={styles.ctas}>
				<MStatusBar navigation={this.props.navigation} />
				<View style={baseStyles.flexGrow} />
				<Text style={styles.title} testID={'onboarding-screen-title'}>
					{strings('onboarding.title')}
				</Text>
				<View style={styles.importWrapper}>
					<Text style={styles.buttonDescription}>{strings('onboarding.subtitle')}</Text>
				</View>

				<TouchableOpacity
					style={styles.createButtonWrapper}
					onPress={this.onPressCreate}
					activeOpacity={activeOpacity}
				>
					<ImageBackground style={styles.buttonBackground} source={CreateBackground} resizeMode={'stretch'}>
						<View style={styles.createWallet}>
							<Image source={Create} />
							<Text style={styles.createWalletText}>{strings('onboarding.start_exploring_now')}</Text>
						</View>
					</ImageBackground>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.importButtonWrapper}
					onPress={this.onPressImport}
					activeOpacity={activeOpacity}
				>
					<ImageBackground style={styles.buttonBackground} source={ImportBackground} resizeMode={'stretch'}>
						<View style={styles.createWallet}>
							<Image source={Import} />
							<Text style={styles.createWalletText}>{strings('onboarding.import_seed_phrase')}</Text>
						</View>
					</ImageBackground>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.importKeyWrapper}
					onPress={this.onPressImportPrivateKey}
					activeOpacity={activeOpacity}
				>
					<Image source={importKey} />
					<Text style={styles.importKeyText}>{strings('onboarding.import_private_key')}</Text>
				</TouchableOpacity>

				<View style={baseStyles.flexGrow} />
				<Text style={styles.bottomText}>{strings('onboarding.prompt_text')}</Text>
				<Image style={styles.footerLogo} source={Logo} />
			</View>
		);
	}

	render() {
		return (
			<View style={baseStyles.flexGrow} testID={'onboarding-screen'}>
				<View style={styles.wrapper}>
					<ScrollView
						style={baseStyles.flexGrow}
						contentContainerStyle={styles.scroll}
						keyboardShouldPersistTaps="handled"
					>
						<View style={styles.scrollWrapper}>{this.renderContent()}</View>
					</ScrollView>
				</View>
				<FadeOutOverlay />
			</View>
		);
	}
}

const mapDispatchToProps = dispatch => ({});

export default connect(
	null,
	mapDispatchToProps
)(Onboarding);
