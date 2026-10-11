export const loadPrototypes = () => {
  String.prototype.titleCase = function () {
    return this.toLowerCase()
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/(?:^|\s)\w/g, function (match) {
        return match.toUpperCase()
      })
  }

  String.prototype.camelCase = function () {
    return this.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
      if (+match === 0) return '' // or if (/\s+/.test(match)) for white spaces

      return index === 0 ? match.toLowerCase() : match.toUpperCase()
    })
  }

  String.prototype.pascalCase = function () {
    return this.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match) {
      return match.toUpperCase()
    })
  }

  String.prototype.truncate = function (len: number = 20, suffix: string = '...') {
    if (this.length <= len) {
      return this.toString()
    }

    const truncated = this.substring(0, len)
    const lastSpaceIndex = truncated.lastIndexOf(' ')
    if (lastSpaceIndex > 0) {
      return truncated.substring(0, lastSpaceIndex) + suffix
    }

    return truncated + suffix
  }
}
