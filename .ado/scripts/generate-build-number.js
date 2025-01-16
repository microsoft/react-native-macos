// @ts-check
let suffix = '';
if (
  process.env.BUILD_SOURCEBRANCHNAME &&
  process.env.BUILD_SOURCEBRANCHNAME !== 'master' &&
  process.env.BUILD_SOURCEBRANCHNAME !== 'main'
) {
  suffix = process.env.BUILD_SOURCEBRANCHNAME;
  suffix = '-' + suffix.replace(/[^a-z0-9A-Z]/g, '');
  console.log('Using nuget suffix: ' + suffix);
}

const sanitizedBuildNumber =
  (process.env.BUILD_BUILDNUMBER
    ? process.env.BUILD_BUILDNUMBER.split('.')
        .map(v => v.replace(/^0+(?!$)/, ''))
        .map(d => (d === '' ? '0' : d))
        .join('.')
    : '0.0.0.1') + suffix;

console.log(`##vso[task.setvariable variable=sanitizedBuildNumber]${sanitizedBuildNumber}`);

module.exports = {
  sanitizedBuildNumber
};
