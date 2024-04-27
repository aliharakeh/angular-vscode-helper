const { join, relative } = require("path");

/**
 * Returns the relative path from the source directory to the destination directory.
 * 
 * The algo removes all common parts and adds .. for each difference
 */
function getRelativePath(src, dest) {
    let srcParts = src.split(/[\\/]/);
    let destParts = dest.split(/[\\/]/);
    let i = 0;
    // Find the first difference
    while (i < srcParts.length && i < destParts.length && srcParts[i] === destParts[i]) {
        i++;
    }
    // remove common parts
    srcParts = srcParts.slice(i);
    destParts = destParts.slice(i);
    // Add .. for each difference and build the path
    return destParts
        .map((_, i) => (i === 0 ? '.' : i === destParts.length - 1 ? '' : '..'))
        .concat(srcParts)
        .join('/');
}

function print(src, dest) {
	console.log('src =', src);
	console.log('dest =', dest);
	console.log('relative =', relative(dest, src));
	console.log('special relative =', getRelativePath(src, dest));
	console.log('******************************************************');
}

// we want to import src in the file in dest
const testPaths = [
	[
		join(__dirname, 'a', 'b', 'c'),
		join(__dirname, 'a', 'b', 'd')
	],
	[
		join(__dirname, 'a', 'b', 'c'),
		join(__dirname, 'd', 'e', 'f')
	]
];

testPaths.forEach(([p1, p2]) => print(p1, p2));

/*
    Conclusion:
    - we need the relative path from the point of view of the dest
    - path.relative() will give us the relative path based on the current working directory and not the dest file 
    which is not what we want
*/