import { strings } from '../../locales/i18n';

export function toLocaleDateTime(timestamp) {
	const dateObj = new Date(timestamp);
	const date = dateObj.toLocaleDateString();
	const time = dateObj.toLocaleTimeString();
	return `${date} ${time}`;
}

export function toDateFormat(timestamp) {
	const dateObj = new Date(timestamp);
	const month = strings(`date.months.${dateObj.getMonth()}`);
	const day = dateObj.getDate();
	let meridiem = 'am';
	let hour = dateObj.getHours();
	if (hour > 12) {
		meridiem = 'pm';
		hour -= 12;
	}
	let min = dateObj.getMinutes();
	if (`${min}`.length === 1) min = `0${min}`;
	return `${month} ${day} ${strings('date.connector')} ${hour}:${min}${meridiem}`;
}

export function toDateFormatSimple(timestamp, multiLine = false) {
	const dateObj = new Date(timestamp);
	let meridiem = 'AM';
	let hour = dateObj.getHours();
	if (hour > 12) {
		meridiem = 'PM';
		hour -= 12;
	}
	let min = dateObj.getMinutes();
	if (`${min}`.length === 1) min = `0${min}`;
	return `${hour}:${min} ${meridiem}`;
}

export function toDateFormatMonthDayYear(timestamp) {
	const dateObj = new Date(timestamp);
	const month = strings(`date.months.${dateObj.getMonth()}`);
	const day = dateObj.getDate();
	const year = dateObj.getFullYear();
	return `${month} ${day}, ${year}`;
}

export function toLocaleDate(timestamp) {
	return new Date(timestamp).toLocaleDateString();
}

export function toLocaleTime(timestamp) {
	return new Date(timestamp).toLocaleTimeString();
}
