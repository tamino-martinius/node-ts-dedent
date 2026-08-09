export function dedent(templ, ...values) {
    let strings = Array.from(typeof templ === 'string' ? [templ] : templ);
    strings[strings.length - 1] = strings[strings.length - 1].replace(/\r?\n([\t ]*)$/, '');
    const indentLengths = strings.reduce((arr, str) => {
        const matches = str.match(/\n([\t ]+|(?!\s).)/g);
        if (matches) {
            return arr.concat(matches.map((match) => match.match(/[\t ]/g)?.length ?? 0));
        }
        return arr;
    }, []);
    if (indentLengths.length) {
        const pattern = new RegExp(`\n[\t ]{${Math.min(...indentLengths)}}`, 'g');
        strings = strings.map((str) => str.replace(pattern, '\n'));
    }
    strings[0] = strings[0].replace(/^\r?\n/, '');
    let string = strings[0];
    values.forEach((value, i) => {
        const endentations = string.match(/(?:^|\n)( *)$/);
        const endentation = endentations ? endentations[1] : '';
        let indentedValue = value;
        if (typeof value === 'string' && value.includes('\n')) {
            indentedValue = String(value)
                .split('\n')
                .map((str, i) => {
                return i === 0 ? str : `${endentation}${str}`;
            })
                .join('\n');
        }
        string += indentedValue + strings[i + 1];
    });
    return string;
}
export default dedent;
