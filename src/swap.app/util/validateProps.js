const validateProps = (obj, ...props) => {
  const result = {}

  props.forEach((propName) => {
    result[propName] = obj[propName]
  })

  return result
}


export default validateProps
