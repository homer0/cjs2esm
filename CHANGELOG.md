# [3.0.0](https://github.com/homer0/cjs2esm/compare/2.0.2...3.0.0) (2022-05-17)


### Bug Fixes

* add patch for 5to6 ([e819879](https://github.com/homer0/cjs2esm/commit/e819879635db0304d1a71b93fc9d896a61b48227))
* drop support for Node 12 ([91a53d7](https://github.com/homer0/cjs2esm/commit/91a53d7f4e82be00d1d06b492a9de08ff2269aac))
* preserve leading comments ([36c44cc](https://github.com/homer0/cjs2esm/commit/36c44cc9679dc23de231c9be193fc804f524c1a7))
* properly resolve the path the transformations ([0069848](https://github.com/homer0/cjs2esm/commit/00698483cc2c0a903d06975fb508d23a697471fe))
* update dependencies ([0a8c55d](https://github.com/homer0/cjs2esm/commit/0a8c55ddece403648a413adca79542957c6cd29f))
* upgrade jscodeshift ([577afae](https://github.com/homer0/cjs2esm/commit/577afae0e5b72194dbac18d95f09866c77b20baa))
* use a better exp to replace modules ([5902cee](https://github.com/homer0/cjs2esm/commit/5902ceec3a58469300303858c904747d2ac55a27))


### Features

* allow for custom transformations ([3361f7c](https://github.com/homer0/cjs2esm/commit/3361f7cb84a14bb88f034c30e4c57dbbecce2ea3))
* allow to customize the codemod paths ([85f381b](https://github.com/homer0/cjs2esm/commit/85f381b556ec9ef0b85eb93ec31c4e3e82aa793f))
* allow to set an order for the transformations ([9b35698](https://github.com/homer0/cjs2esm/commit/9b3569832c82f07278de65790f8c76259a3f21e2))


### BREAKING CHANGES

* This package no longer supports Node 12.

## [2.0.2](https://github.com/homer0/cjs2esm/compare/2.0.1...2.0.2) (2021-10-17)


### Bug Fixes

* update dependencies ([d9af83e](https://github.com/homer0/cjs2esm/commit/d9af83e8141108bee56755130511a48e02344f32))

## [2.0.1](https://github.com/homer0/cjs2esm/compare/2.0.0...2.0.1) (2021-09-04)


### Bug Fixes

* update dependencies ([accccbc](https://github.com/homer0/cjs2esm/commit/accccbccc064fac28c74b4be9193d3c2c77a1828))

# [2.0.0](https://github.com/homer0/cjs2esm/compare/1.1.2...2.0.0) (2021-04-11)


### Bug Fixes

* drop support for Node 10 ([7359caa](https://github.com/homer0/cjs2esm/commit/7359caa401ec6dba1adee075eb3c18a3e9da246e))


### BREAKING CHANGES

* This package no longer supports Node 10.

## [1.1.2](https://github.com/homer0/cjs2esm/compare/1.1.1...1.1.2) (2021-03-07)


### Bug Fixes

* downgrade jscodeshift to prevent issues with exports ([befa6a6](https://github.com/homer0/cjs2esm/commit/befa6a6117f7b658d26c4c9a18639e2546fe5e5d))

## [1.1.1](https://github.com/homer0/cjs2esm/compare/1.1.0...1.1.1) (2021-03-07)


### Bug Fixes

* disable husky on CD action ([6986dbf](https://github.com/homer0/cjs2esm/commit/6986dbffd054e77fa736a5145a16697d59138a7f))
* update dependencies ([9f97fea](https://github.com/homer0/cjs2esm/commit/9f97fea8d021c331d1dd10ca4b4da7ff3fdc7ddd))
* use is-ci to prevent husky from running on the CI ([ed5e7ae](https://github.com/homer0/cjs2esm/commit/ed5e7aee0f0799f3984d11e08415137b3015cb5e))

# [1.1.0](https://github.com/homer0/cjs2esm/compare/1.0.0...1.1.0) (2020-08-10)


### Bug Fixes

* add support for files with shebang ([f57f8db](https://github.com/homer0/cjs2esm/commit/f57f8db9550832e1f4fb39e03823b23cef522a19))
* add support for require('.') ([a254a3f](https://github.com/homer0/cjs2esm/commit/a254a3fba739221c0f67c44908726a4d05d8a6be))


### Features

* add a prepublishOnly script to create a ESM version ([a83c5c7](https://github.com/homer0/cjs2esm/commit/a83c5c7765426b3729e2f070249962d324e65017))

# 1.0.0 (2020-08-09)


### Bug Fixes

* allow the use of the .js extension ([c334ebb](https://github.com/homer0/cjs2esm/commit/c334ebb4c5f43051c2d9a1111b777344811c5c8c))
* flat sub directories' contents ([f62709d](https://github.com/homer0/cjs2esm/commit/f62709d0b17656c3c8c3ce8d22bbbeb96b71fdce))
* make a proxy for require ([ef97f20](https://github.com/homer0/cjs2esm/commit/ef97f20cf26152e68815242253456c7b48afb00f))
* move the generic functions into a utility file ([b4ce5fc](https://github.com/homer0/cjs2esm/commit/b4ce5fc01fbcab18d53fbd0994bd982b5451d686))
* reload the list of imports after the first change ([a586244](https://github.com/homer0/cjs2esm/commit/a586244b3acb9cc3b980e6acc4d312084d7085de))
* remove support for package.json on the path from the main ([6683ec9](https://github.com/homer0/cjs2esm/commit/6683ec91503d52dcb93ad7b4e71a6bcadba46f67))
* use more specific options for the extension handling ([59121dc](https://github.com/homer0/cjs2esm/commit/59121dc402cb96442556b00398df4ca4281d3730))
* use the fn to parse JS files when looking for a extension ([454475b](https://github.com/homer0/cjs2esm/commit/454475b43edcbc2faa83c47809ff8d6379e55d9d))


### Features

* add error handling ([07001ab](https://github.com/homer0/cjs2esm/commit/07001abb33819c834708c4fbb196471484d7eebd))
* add functionality to clean the output directory ([bf35add](https://github.com/homer0/cjs2esm/commit/bf35add251e22e951007d3cf3d9c60662ab8b919))
* add functionality to load the configuration ([c0b353f](https://github.com/homer0/cjs2esm/commit/c0b353f73cf15ce214a2a3dea9da2ce606769d18))
* add package.json on the output directory with type module ([8b9063b](https://github.com/homer0/cjs2esm/commit/8b9063b7a0f86d474ceabaaab8f259447fc453d3))
* add transformation for module paths ([ec43420](https://github.com/homer0/cjs2esm/commit/ec4342085d56cc4990ae9c2aabb845ca44d9a741))
* add transformation to add missing mjs extensions ([350c78d](https://github.com/homer0/cjs2esm/commit/350c78d4dc3af5740a171d0dd6bf09bcb131953b))
* add transformations for default exports ([40a5c14](https://github.com/homer0/cjs2esm/commit/40a5c141bf4dcd0aa56cd48f27ceec87fefce72a))
* find and copy all the files to the output directory ([88f77a4](https://github.com/homer0/cjs2esm/commit/88f77a4cb445ca38e8858d0f1e1187ab2a619d0b))
* show ellapsed time ([4c1c8d6](https://github.com/homer0/cjs2esm/commit/4c1c8d66844bea13f6c3fa55ee4415e20b67abd6))
* transform imports and exports ([1e4ee4d](https://github.com/homer0/cjs2esm/commit/1e4ee4d87ac1678809952fbf3c75c749e854774a))
* update project package.json and add module entry ([f171e03](https://github.com/homer0/cjs2esm/commit/f171e03282147097b2a5576c300a8c2f754d2869))
